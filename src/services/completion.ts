import type { Queryable } from '../db/pool.js';
import { getTeamReportsForPeriod, getTeamRoster } from '../db/dashboard.js';
import { getPeriodById } from '../db/reports.js';
import { getTeamFreezeConfig } from '../db/teams.js';
import { profileLabelFor } from '../dashboard/profiles.js';
import { computeFreezeInstant } from './freeze.js';
import type { CompletionReport, CompletionRow, CompletionStatus } from '../dashboard/types.js';

const STATUS_ORDER: Record<CompletionStatus, number> = { missing: 0, late: 1, on_time: 2 };

/**
 * Delay/completion report for one team+period: every roster member tagged on_time / late /
 * missing against the team's freeze deadline for that period. Rows are sorted so the people a
 * manager needs to chase (missing, then late) surface first.
 */
export async function getCompletionReport(db: Queryable, teamId: string, periodId: number): Promise<CompletionReport> {
  const [period, freezeConfig, roster, reports] = await Promise.all([
    getPeriodById(db, periodId),
    getTeamFreezeConfig(db, teamId),
    getTeamRoster(db, teamId),
    getTeamReportsForPeriod(db, teamId, periodId),
  ]);

  const deadline = period && freezeConfig ? computeFreezeInstant(period.endsOn, freezeConfig).toUTC().toISO() : null;
  const reportByUser = new Map(reports.map((r) => [r.userId, r]));

  const rows: CompletionRow[] = roster.map((member) => {
    const report = reportByUser.get(member.userId);
    let status: CompletionStatus = 'missing';
    if (report?.submittedAt) {
      status = deadline && new Date(report.submittedAt).getTime() > new Date(deadline).getTime() ? 'late' : 'on_time';
    }
    return {
      userId: member.userId,
      displayName: member.displayName,
      profileCode: member.profileCode,
      profileLabel: profileLabelFor(member.profileCode),
      status,
      submittedAt: report?.submittedAt ?? null,
    };
  });

  rows.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  const onTime = rows.filter((r) => r.status === 'on_time').length;
  const late = rows.filter((r) => r.status === 'late').length;
  const missing = rows.filter((r) => r.status === 'missing').length;

  return {
    deadline,
    rows,
    summary: {
      onTime,
      late,
      missing,
      completionPct: rows.length ? Math.round(((onTime + late) / rows.length) * 100) : 0,
    },
  };
}
