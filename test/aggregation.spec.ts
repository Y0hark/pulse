import { describe, expect, it } from 'vitest';
import { computeDashboard } from '../src/services/aggregation.js';
import type { RosterMember, TeamReportInput } from '../src/dashboard/types.js';

function member(userId: string, profileCode: string | null, displayName: string | null = null): RosterMember {
  return { userId, displayName, profileCode };
}

function report(overrides: Partial<TeamReportInput> & { userId: string }): TeamReportInput {
  return {
    id: `report-${overrides.userId}`,
    workload: 0,
    deliveredCnt: 0,
    inflightCnt: 0,
    submittedAt: '2026-07-20T10:00:00.000Z',
    projectCardStatuses: [],
    alerts: [],
    opportunities: [],
    ...overrides,
  };
}

describe('computeDashboard', () => {
  it('returns all-zero stats for an empty team', () => {
    const result = computeDashboard([], []);

    expect(result.workload).toEqual({
      mean: 0,
      max: 0,
      min: 0,
      distribution: [
        { bucket: 'low', count: 0 },
        { bucket: 'steady', count: 0 },
        { bucket: 'high', count: 0 },
        { bucket: 'critical', count: 0 },
      ],
    });
    expect(result.totalDelivered).toBe(0);
    expect(result.totalInFlight).toBe(0);
    expect(result.projectHealth).toEqual({ good: 0, at_risk: 0, blocked: 0 });
    expect(result.byProfile.every((p) => p.headcount === 0 && p.meanWorkload === 0 && p.delivered === 0)).toBe(true);
    expect(result.alerts).toEqual([]);
    expect(result.opportunities).toEqual([]);
    expect(result.submissionStatus).toEqual({ submitted: [], pending: [] });
  });

  it('treats members with no report row yet as pending, not an error', () => {
    const roster = [member('u1', 'ba'), member('u2', 'pm')];
    const result = computeDashboard(roster, []);

    expect(result.submissionStatus.pending).toEqual([
      { userId: 'u1', displayName: null },
      { userId: 'u2', displayName: null },
    ]);
    expect(result.submissionStatus.submitted).toEqual([]);
  });

  it('excludes unsubmitted (autosaved-only) reports from the numeric stats', () => {
    const roster = [member('u1', 'ba'), member('u2', 'pm')];
    const reports = [
      report({ userId: 'u1', workload: 90, submittedAt: null }),
      report({ userId: 'u2', workload: 40 }),
    ];
    const result = computeDashboard(roster, reports);

    expect(result.workload.mean).toBe(40);
    expect(result.workload.max).toBe(40);
    expect(result.submissionStatus.pending).toEqual([{ userId: 'u1', displayName: null }]);
    expect(result.submissionStatus.submitted).toEqual([{ userId: 'u2', displayName: null }]);
  });

  it('computes mean/max/min workload and bucket distribution across submitted reports', () => {
    const roster = [member('u1', null), member('u2', null), member('u3', null), member('u4', null)];
    const reports = [
      report({ userId: 'u1', workload: 10 }), // low
      report({ userId: 'u2', workload: 55 }), // steady
      report({ userId: 'u3', workload: 80 }), // high
      report({ userId: 'u4', workload: 95 }), // critical
    ];
    const result = computeDashboard(roster, reports);

    expect(result.workload.mean).toBe(60);
    expect(result.workload.max).toBe(95);
    expect(result.workload.min).toBe(10);
    expect(result.workload.distribution).toEqual([
      { bucket: 'low', count: 1 },
      { bucket: 'steady', count: 1 },
      { bucket: 'high', count: 1 },
      { bucket: 'critical', count: 1 },
    ]);
  });

  it('sums delivered/in-flight totals and project health counts across submitted reports', () => {
    const roster = [member('u1', null), member('u2', null)];
    const reports = [
      report({ userId: 'u1', deliveredCnt: 3, inflightCnt: 1, projectCardStatuses: ['good', 'at_risk'] }),
      report({ userId: 'u2', deliveredCnt: 2, inflightCnt: 4, projectCardStatuses: ['blocked', 'good'] }),
    ];
    const result = computeDashboard(roster, reports);

    expect(result.totalDelivered).toBe(5);
    expect(result.totalInFlight).toBe(5);
    expect(result.projectHealth).toEqual({ good: 2, at_risk: 1, blocked: 1 });
  });

  it('groups by profile with correct headcount, mean workload, and delivered per profile', () => {
    const roster = [
      member('u1', 'ba'),
      member('u2', 'ba'),
      member('u3', 'pm'),
      member('u4', null), // unassigned profile: counted nowhere in byProfile
    ];
    const reports = [
      report({ userId: 'u1', workload: 20, deliveredCnt: 1 }),
      report({ userId: 'u2', workload: 60, deliveredCnt: 3 }),
      report({ userId: 'u3', workload: 50, deliveredCnt: 2 }),
      report({ userId: 'u4', workload: 100, deliveredCnt: 9 }),
    ];
    const result = computeDashboard(roster, reports);

    const ba = result.byProfile.find((p) => p.code === 'ba')!;
    expect(ba.headcount).toBe(2);
    expect(ba.meanWorkload).toBe(40);
    expect(ba.delivered).toBe(4);

    const pm = result.byProfile.find((p) => p.code === 'pm')!;
    expect(pm.headcount).toBe(1);
    expect(pm.meanWorkload).toBe(50);
    expect(pm.delivered).toBe(2);

    const manager = result.byProfile.find((p) => p.code === 'manager')!;
    expect(manager.headcount).toBe(0);
    expect(manager.meanWorkload).toBe(0);
    expect(manager.delivered).toBe(0);
  });

  it('a profile with headcount but no submitted reports yet reports zero mean/delivered, not NaN', () => {
    const roster = [member('u1', 'consultant')];
    const result = computeDashboard(roster, []);

    const consultant = result.byProfile.find((p) => p.code === 'consultant')!;
    expect(consultant.headcount).toBe(1);
    expect(consultant.meanWorkload).toBe(0);
    expect(consultant.delivered).toBe(0);
  });

  it('sorts the alerts feed critical-first', () => {
    const roster = [member('u1', null), member('u2', null)];
    const reports = [
      report({ userId: 'u1', alerts: [{ content: 'minor thing', severity: 'info' }] }),
      report({
        userId: 'u2',
        alerts: [
          { content: 'vendor blocked', severity: 'critical' },
          { content: 'watch this', severity: 'warn' },
        ],
      }),
    ];
    const result = computeDashboard(roster, reports);

    expect(result.alerts.map((a) => a.severity)).toEqual(['critical', 'warn', 'info']);
  });

  it('flattens opportunities across submitted reports', () => {
    const roster = [member('u1', null)];
    const reports = [
      report({
        userId: 'u1',
        opportunities: [
          { id: 'o1', type: 'new_project', content: 'Adjacent team asked for help' },
          { id: 'o2', type: 'open_position', content: 'Need a BA' },
        ],
      }),
    ];
    const result = computeDashboard(roster, reports);

    expect(result.opportunities).toHaveLength(2);
    expect(result.opportunities.map((o) => o.type)).toEqual(['new_project', 'open_position']);
  });
});
