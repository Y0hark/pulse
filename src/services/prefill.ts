import type { ReportDraft, ReportRecord } from '../reports/types.js';

/**
 * Clones the previous week's report into a fresh draft: project cards and
 * structure carry over, but delivered/in-flight counters reset to 0 since
 * they are per-week metrics, and majorTasksDid/alerts/opportunities are
 * week-specific and start empty.
 */
export function buildDraftFromPrevious(previous: ReportRecord | null): ReportDraft {
  if (!previous) {
    return {
      workload: 0,
      deliveredCnt: 0,
      inflightCnt: 0,
      projectCards: [],
      majorTasksDid: [],
      majorTasksToDo: [],
      alerts: [],
      opportunities: [],
    };
  }

  return {
    workload: previous.workload,
    deliveredCnt: 0,
    inflightCnt: 0,
    projectCards: previous.projectCards.map((card) => ({
      title: card.title,
      description: card.description,
      status: card.status,
      sortOrder: card.sortOrder,
    })),
    majorTasksDid: [],
    majorTasksToDo: previous.majorTasksToDo,
    alerts: [],
    opportunities: [],
  };
}
