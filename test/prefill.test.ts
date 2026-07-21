import { describe, expect, it } from 'vitest';
import { buildDraftFromPrevious } from '../src/services/prefill.js';
import type { ReportRecord } from '../src/reports/types.js';

function previousReport(overrides: Partial<ReportRecord> = {}): ReportRecord {
  return {
    id: 'report-1',
    periodId: 1,
    workload: 72,
    deliveredCnt: 4,
    inflightCnt: 2,
    submittedAt: '2026-07-14T09:00:00Z',
    updatedAt: '2026-07-14T09:00:00Z',
    projectCards: [
      { id: 'card-1', title: 'Migrate billing', description: 'Move to new provider', status: 'at_risk', sortOrder: 0 },
    ],
    majorTasksDid: ['Shipped v2 API'],
    majorTasksToDo: ['Finish billing migration'],
    alerts: [{ content: 'Vendor delay', severity: 'warn' }],
    opportunities: [{ id: 'opp-1', type: 'new_budget', content: 'Ask for Q3 budget' }],
    ...overrides,
  };
}

describe('buildDraftFromPrevious', () => {
  it('returns an empty draft when there is no previous report', () => {
    const draft = buildDraftFromPrevious(null);
    expect(draft).toEqual({
      workload: 0,
      deliveredCnt: 0,
      inflightCnt: 0,
      projectCards: [],
      majorTasksDid: [],
      majorTasksToDo: [],
      alerts: [],
      opportunities: [],
    });
  });

  it('carries over workload, project cards, and open to-dos, but resets weekly counters and did/alerts/opportunities', () => {
    const draft = buildDraftFromPrevious(previousReport());

    expect(draft.workload).toBe(72);
    expect(draft.deliveredCnt).toBe(0);
    expect(draft.inflightCnt).toBe(0);
    expect(draft.projectCards).toEqual([
      { title: 'Migrate billing', description: 'Move to new provider', status: 'at_risk', sortOrder: 0 },
    ]);
    expect(draft.majorTasksToDo).toEqual(['Finish billing migration']);
    expect(draft.majorTasksDid).toEqual([]);
    expect(draft.alerts).toEqual([]);
    expect(draft.opportunities).toEqual([]);
  });
});
