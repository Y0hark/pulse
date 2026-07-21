import type { Queryable } from './pool.js';
import type { AlertSeverity, ProjectStatus } from '../reports/types.js';
import type { RosterMember, TeamReportInput } from '../dashboard/types.js';

export async function getTeamRoster(db: Queryable, teamId: string): Promise<RosterMember[]> {
  const result = await db.query(
    `SELECT u.id, u.display_name, p.code AS profile_code
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     LEFT JOIN profiles p ON p.id = u.profile_id
     WHERE tm.team_id = $1`,
    [teamId],
  );
  return result.rows.map((r: any) => ({
    userId: r.id,
    displayName: r.display_name,
    profileCode: r.profile_code,
  }));
}

/** Bulk-fetches every team member's report (+ child rows) for one period, for the
 * dashboard aggregation. Avoids one round-trip per member. */
export async function getTeamReportsForPeriod(
  db: Queryable,
  teamId: string,
  periodId: number,
): Promise<TeamReportInput[]> {
  const reportsResult = await db.query(
    `SELECT r.id, r.user_id, r.workload, r.delivered_cnt, r.inflight_cnt, r.submitted_at
     FROM reports r WHERE r.team_id = $1 AND r.period_id = $2`,
    [teamId, periodId],
  );
  if (reportsResult.rows.length === 0) return [];

  const reportIds = reportsResult.rows.map((r: any) => r.id);
  const [cardsResult, alertsResult, opportunitiesResult] = await Promise.all([
    db.query(`SELECT report_id, status FROM project_cards WHERE report_id = ANY($1)`, [reportIds]),
    db.query(`SELECT report_id, content, severity FROM report_items WHERE report_id = ANY($1) AND kind = 'alert'`, [
      reportIds,
    ]),
    db.query(`SELECT id, report_id, type, content FROM opportunities WHERE report_id = ANY($1)`, [reportIds]),
  ]);

  return reportsResult.rows.map((r: any) => ({
    userId: r.user_id,
    workload: r.workload,
    deliveredCnt: r.delivered_cnt,
    inflightCnt: r.inflight_cnt,
    submittedAt: r.submitted_at,
    projectCardStatuses: cardsResult.rows
      .filter((c: any) => c.report_id === r.id)
      .map((c: any) => c.status as ProjectStatus),
    alerts: alertsResult.rows
      .filter((i: any) => i.report_id === r.id)
      .map((i: any) => ({ content: i.content, severity: i.severity as AlertSeverity })),
    opportunities: opportunitiesResult.rows
      .filter((o: any) => o.report_id === r.id)
      .map((o: any) => ({ id: o.id, type: o.type, content: o.content })),
  }));
}
