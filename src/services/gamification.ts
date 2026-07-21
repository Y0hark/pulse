import type { Queryable } from '../db/pool.js';
import { getSubmissionHistory } from '../db/reports.js';
import { getTeamFreezeConfig } from '../db/teams.js';
import type { GamificationConfig } from '../config/pulse.js';
import { computeFreezeInstant } from './freeze.js';
import type {
  Badge,
  CompletionInput,
  CompletionRingResult,
  PeriodXp,
  StreakResult,
  SubmissionRecord,
  XpResult,
} from '../gamification/types.js';

/** Pure: XP for a single period. On time (submitted at/before the deadline) awards the full
 * on-time amount; late submissions decay linearly per hour late, floored at 0; a missing
 * submission earns nothing. Never throws and never blocks submission — this is a read model. */
export function computePeriodXp(
  record: SubmissionRecord,
  rules: Pick<GamificationConfig, 'onTimeXp' | 'lateXpDecayPerHour'>,
): PeriodXp {
  if (!record.submittedAt) {
    return { periodId: record.periodId, xp: 0, onTime: false };
  }

  const submittedAt = new Date(record.submittedAt).getTime();
  const deadline = new Date(record.deadline).getTime();
  if (submittedAt <= deadline) {
    return { periodId: record.periodId, xp: rules.onTimeXp, onTime: true };
  }

  const hoursLate = (submittedAt - deadline) / (1000 * 60 * 60);
  const xp = Math.max(0, rules.onTimeXp - hoursLate * rules.lateXpDecayPerHour);
  return { periodId: record.periodId, xp, onTime: false };
}

/** Pure: total XP across a submission history, plus the per-period breakdown. `records` may be
 * in any order — the periods array preserves that order for display alongside the total. */
export function computeXp(
  records: SubmissionRecord[],
  rules: Pick<GamificationConfig, 'onTimeXp' | 'lateXpDecayPerHour'>,
): XpResult {
  const periods = records.map((r) => computePeriodXp(r, rules));
  return { total: periods.reduce((sum, p) => sum + p.xp, 0), periods };
}

/** Pure: current and longest streaks of consecutive on-time submissions. `records` must be sorted
 * chronologically ascending (oldest first). A missing submission always breaks the streak. A late
 * (but submitted) one breaks it too unless `streakBreaksOnLate` is false, in which case it's a
 * neutral skip — neither extends nor breaks — matching the "gentle, never punitive" guard. */
export function computeStreak(
  records: SubmissionRecord[],
  rules: Pick<GamificationConfig, 'streakBreaksOnLate'>,
): StreakResult {
  let longest = 0;
  let running = 0;

  for (const record of records) {
    const onTime = record.submittedAt != null && new Date(record.submittedAt).getTime() <= new Date(record.deadline).getTime();
    if (onTime) {
      running += 1;
      longest = Math.max(longest, running);
      continue;
    }
    const lateButSubmitted = record.submittedAt != null;
    if (lateButSubmitted && !rules.streakBreaksOnLate) {
      continue; // neutral: doesn't extend, doesn't break
    }
    running = 0;
  }

  // Current streak: walk back from the most recent record under the same rule.
  let current = 0;
  for (let i = records.length - 1; i >= 0; i -= 1) {
    const record = records[i];
    const onTime = record.submittedAt != null && new Date(record.submittedAt).getTime() <= new Date(record.deadline).getTime();
    if (onTime) {
      current += 1;
      continue;
    }
    const lateButSubmitted = record.submittedAt != null;
    if (lateButSubmitted && !rules.streakBreaksOnLate) {
      continue;
    }
    break;
  }

  return { current, longest };
}

/** Pure: % of fields "meaningfully filled" on a draft — a soft signal, never a gate on Submit. */
export function computeCompletionRing(input: CompletionInput): CompletionRingResult {
  const checks = [input.workload > 0, input.projectCards.length > 0, input.majorTasksDid.length > 0, input.majorTasksToDo.length > 0];
  const filledFields = checks.filter(Boolean).length;
  const totalFields = checks.length;
  return { percent: Math.round((filledFields / totalFields) * 100), filledFields, totalFields };
}

/** Pure: badges earned given this period's context. Streak thresholds come from boot config so
 * new tiers can be added without a deploy. Purely additive/cosmetic — never gates submission. */
export function computeBadges(
  streak: StreakResult,
  isFirstSubmitter: boolean,
  hasZeroBlockers: boolean,
  rules: Pick<GamificationConfig, 'badgeStreakThresholds'>,
): Badge[] {
  const badges: Badge[] = [];

  for (const threshold of [...rules.badgeStreakThresholds].sort((a, b) => a - b)) {
    if (streak.current >= threshold) {
      badges.push({ code: 'streak', label: `${threshold}-week streak`, threshold });
    }
  }
  if (isFirstSubmitter) {
    badges.push({ code: 'first_submitter', label: 'First submitter of the week' });
  }
  if (hasZeroBlockers) {
    badges.push({ code: 'zero_blockers', label: 'Zero blockers' });
  }

  return badges;
}

/** Loads a user's recent submission history for a team and turns each period into a
 * {@link SubmissionRecord}, chronological ascending (oldest first) as computeStreak/computeXp
 * expect. The per-period deadline is derived from the team's freeze config, same as auto-freeze. */
export async function getUserSubmissionRecords(
  db: Queryable,
  teamId: string,
  userId: string,
  uptoPeriodId: number,
  limit = 12,
): Promise<SubmissionRecord[]> {
  const freezeConfig = await getTeamFreezeConfig(db, teamId);
  if (!freezeConfig) return [];

  const history = await getSubmissionHistory(db, userId, teamId, uptoPeriodId, limit);
  return history
    .map((row) => ({
      periodId: row.periodId,
      submittedAt: row.submittedAt,
      deadline: computeFreezeInstant(row.endsOn, freezeConfig).toUTC().toISO()!,
    }))
    .reverse();
}
