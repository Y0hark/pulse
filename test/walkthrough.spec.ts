import { describe, expect, it } from 'vitest';
import { computeWalkthrough } from '../src/services/walkthrough.js';
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

describe('computeWalkthrough', () => {
  it('flags members with no report row as not_submitted, with null stats', () => {
    const roster = [member('u1', 'ba', 'Alice')];
    const result = computeWalkthrough(roster, []);

    expect(result).toEqual([
      {
        user: { id: 'u1', displayName: 'Alice' },
        profile: { code: 'ba', label: 'BA' },
        status: 'not_submitted',
        workload: null,
        deliveredCnt: null,
        inflightCnt: null,
        reportId: null,
      },
    ]);
  });

  it('treats an unsubmitted (autosaved-only) report the same as no report: not_submitted', () => {
    const roster = [member('u1', 'ba', 'Alice')];
    const reports = [report({ userId: 'u1', workload: 90, submittedAt: null })];
    const result = computeWalkthrough(roster, reports);

    expect(result[0].status).toBe('not_submitted');
    expect(result[0].workload).toBeNull();
  });

  it('puts every submitted member before every not-yet-submitted member', () => {
    const roster = [member('u1', 'ba', 'Zed'), member('u2', 'ba', 'Amy')];
    const reports = [report({ userId: 'u1', workload: 50 })];
    const result = computeWalkthrough(roster, reports);

    expect(result.map((r) => r.user.id)).toEqual(['u1', 'u2']);
    expect(result.map((r) => r.status)).toEqual(['submitted', 'not_submitted']);
  });

  it('within each status group, orders by profile (PROFILE_DEFS order) then display name', () => {
    const roster = [
      member('u1', 'pm', 'Zed'),
      member('u2', 'ba', 'Beth'),
      member('u3', 'ba', 'Amy'),
      member('u4', null, 'Nadia'),
    ];
    const reports = [
      report({ userId: 'u1' }),
      report({ userId: 'u2' }),
      report({ userId: 'u3' }),
      report({ userId: 'u4' }),
    ];
    const result = computeWalkthrough(roster, reports);

    // ba < pm < unassigned, and within ba, Amy < Beth
    expect(result.map((r) => r.user.id)).toEqual(['u3', 'u2', 'u1', 'u4']);
  });

  it('carries the report id through so the presenter can fetch the full body', () => {
    const roster = [member('u1', 'ba', 'Alice')];
    const reports = [report({ userId: 'u1', id: 'report-abc' })];
    const result = computeWalkthrough(roster, reports);

    expect(result[0].reportId).toBe('report-abc');
  });
});
