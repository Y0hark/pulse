import { describe, expect, it } from 'vitest';
import { computeBadges, computeCompletionRing, computePeriodXp, computeStreak, computeXp } from '../src/services/gamification.js';
import type { SubmissionRecord } from '../src/gamification/types.js';

const rules = { onTimeXp: 10, lateXpDecayPerHour: 1, streakBreaksOnLate: true, badgeStreakThresholds: [4, 8] };

function record(periodId: number, submittedAt: string | null, deadline = '2026-07-14T09:30:00.000Z'): SubmissionRecord {
  return { periodId, submittedAt, deadline };
}

describe('computePeriodXp', () => {
  it('awards full XP for a submission at or before the deadline', () => {
    expect(computePeriodXp(record(1, '2026-07-14T09:00:00.000Z'), rules)).toEqual({ periodId: 1, xp: 10, onTime: true });
    expect(computePeriodXp(record(1, '2026-07-14T09:30:00.000Z'), rules)).toEqual({ periodId: 1, xp: 10, onTime: true });
  });

  it('decays XP linearly per hour late, floored at 0', () => {
    expect(computePeriodXp(record(1, '2026-07-14T12:30:00.000Z'), rules)).toEqual({ periodId: 1, xp: 7, onTime: false });
    expect(computePeriodXp(record(1, '2026-07-15T09:30:00.000Z'), rules)).toEqual({ periodId: 1, xp: 0, onTime: false });
  });

  it('awards zero XP for a missing submission', () => {
    expect(computePeriodXp(record(1, null), rules)).toEqual({ periodId: 1, xp: 0, onTime: false });
  });
});

describe('computeXp', () => {
  it('sums XP across periods and preserves per-period breakdown', () => {
    const records = [record(1, '2026-07-14T09:00:00.000Z'), record(2, null, '2026-07-21T09:30:00.000Z')];
    const result = computeXp(records, rules);
    expect(result.total).toBe(10);
    expect(result.periods).toHaveLength(2);
  });
});

describe('computeStreak', () => {
  it('counts consecutive on-time submissions as the current streak', () => {
    const records = [
      record(1, '2026-07-07T09:00:00.000Z', '2026-07-07T09:30:00.000Z'),
      record(2, '2026-07-14T09:00:00.000Z', '2026-07-14T09:30:00.000Z'),
      record(3, '2026-07-21T09:00:00.000Z', '2026-07-21T09:30:00.000Z'),
    ];
    expect(computeStreak(records, rules)).toEqual({ current: 3, longest: 3 });
  });

  it('a missing submission always breaks the streak', () => {
    const records = [
      record(1, '2026-07-07T09:00:00.000Z', '2026-07-07T09:30:00.000Z'),
      record(2, null, '2026-07-14T09:30:00.000Z'),
      record(3, '2026-07-21T09:00:00.000Z', '2026-07-21T09:30:00.000Z'),
    ];
    expect(computeStreak(records, rules)).toEqual({ current: 1, longest: 1 });
  });

  it('a late submission breaks the streak when streakBreaksOnLate is true', () => {
    const records = [
      record(1, '2026-07-07T09:00:00.000Z', '2026-07-07T09:30:00.000Z'),
      record(2, '2026-07-14T12:00:00.000Z', '2026-07-14T09:30:00.000Z'),
      record(3, '2026-07-21T09:00:00.000Z', '2026-07-21T09:30:00.000Z'),
    ];
    expect(computeStreak(records, rules)).toEqual({ current: 1, longest: 1 });
  });

  it('a late submission is a neutral skip (not a break) when streakBreaksOnLate is false', () => {
    const lenientRules = { ...rules, streakBreaksOnLate: false };
    const records = [
      record(1, '2026-07-07T09:00:00.000Z', '2026-07-07T09:30:00.000Z'),
      record(2, '2026-07-14T12:00:00.000Z', '2026-07-14T09:30:00.000Z'),
      record(3, '2026-07-21T09:00:00.000Z', '2026-07-21T09:30:00.000Z'),
    ];
    expect(computeStreak(records, lenientRules)).toEqual({ current: 2, longest: 2 });
  });

  it('tracks the longest streak separately from the current one', () => {
    const records = [
      record(1, '2026-07-07T09:00:00.000Z', '2026-07-07T09:30:00.000Z'),
      record(2, '2026-07-14T09:00:00.000Z', '2026-07-14T09:30:00.000Z'),
      record(3, '2026-07-21T09:00:00.000Z', '2026-07-21T09:30:00.000Z'),
      record(4, null, '2026-07-28T09:30:00.000Z'),
    ];
    expect(computeStreak(records, rules)).toEqual({ current: 0, longest: 3 });
  });

  it('returns zero streaks for an empty history', () => {
    expect(computeStreak([], rules)).toEqual({ current: 0, longest: 0 });
  });
});

describe('computeCompletionRing', () => {
  it('is 0% for a fully empty draft', () => {
    expect(computeCompletionRing({ workload: 0, projectCards: [], majorTasksDid: [], majorTasksToDo: [] })).toEqual({
      percent: 0,
      filledFields: 0,
      totalFields: 4,
    });
  });

  it('is 100% when every meaningful field is filled', () => {
    expect(
      computeCompletionRing({ workload: 60, projectCards: [{}], majorTasksDid: ['a'], majorTasksToDo: ['b'] }),
    ).toEqual({ percent: 100, filledFields: 4, totalFields: 4 });
  });

  it('rounds partial completion to the nearest percent', () => {
    expect(computeCompletionRing({ workload: 60, projectCards: [{}], majorTasksDid: [], majorTasksToDo: [] })).toEqual({
      percent: 50,
      filledFields: 2,
      totalFields: 4,
    });
  });
});

describe('computeBadges', () => {
  it('awards a badge per streak threshold met, lowest to highest', () => {
    const badges = computeBadges({ current: 8, longest: 8 }, false, false, rules);
    expect(badges).toEqual([
      { code: 'streak', label: '4-week streak', threshold: 4 },
      { code: 'streak', label: '8-week streak', threshold: 8 },
    ]);
  });

  it('awards no streak badge below the lowest threshold', () => {
    expect(computeBadges({ current: 2, longest: 2 }, false, false, rules)).toEqual([]);
  });

  it('awards first-submitter and zero-blockers badges independently of streak', () => {
    const badges = computeBadges({ current: 0, longest: 0 }, true, true, rules);
    expect(badges).toEqual([
      { code: 'first_submitter', label: 'First submitter of the week' },
      { code: 'zero_blockers', label: 'Zero blockers' },
    ]);
  });
});
