import type { Queryable } from './pool.js';
import type {
  AlertSeverity,
  Opportunity,
  PeriodStatus,
  ProjectCard,
  ReportPeriod,
  ReportRecord,
  ReportWritePayload,
} from '../reports/types.js';

export async function getCurrentPeriod(db: Queryable): Promise<ReportPeriod | null> {
  const result = await db.query(
    `SELECT id, iso_week, starts_on, ends_on FROM report_periods
     WHERE starts_on <= now() ORDER BY starts_on DESC LIMIT 1`,
  );
  if (result.rows.length === 0) return null;
  return toPeriod(result.rows[0]);
}

export async function getPeriodByIsoWeek(db: Queryable, isoWeek: string): Promise<ReportPeriod | null> {
  const result = await db.query(`SELECT id, iso_week, starts_on, ends_on FROM report_periods WHERE iso_week = $1`, [
    isoWeek,
  ]);
  if (result.rows.length === 0) return null;
  return toPeriod(result.rows[0]);
}

export async function getPeriodById(db: Queryable, periodId: number): Promise<ReportPeriod | null> {
  const result = await db.query(`SELECT id, iso_week, starts_on, ends_on FROM report_periods WHERE id = $1`, [
    periodId,
  ]);
  if (result.rows.length === 0) return null;
  return toPeriod(result.rows[0]);
}

export async function getTeamPeriodStatus(db: Queryable, teamId: string, periodId: number): Promise<PeriodStatus> {
  const result = await db.query(`SELECT status FROM team_period_status WHERE team_id = $1 AND period_id = $2`, [
    teamId,
    periodId,
  ]);
  if (result.rows.length === 0) return 'open';
  return result.rows[0].status;
}

/** Test/admin-only helper: no route exposes freezing yet (own ticket). */
export async function setTeamPeriodStatus(
  db: Queryable,
  teamId: string,
  periodId: number,
  status: PeriodStatus,
): Promise<void> {
  await db.query(
    `INSERT INTO team_period_status (team_id, period_id, status, frozen_at)
     VALUES ($1, $2, $3, CASE WHEN $3 = 'frozen' THEN now() ELSE NULL END)
     ON CONFLICT (team_id, period_id) DO UPDATE SET
       status = EXCLUDED.status,
       frozen_at = EXCLUDED.frozen_at`,
    [teamId, periodId, status],
  );
}

export async function getReportForPeriod(
  db: Queryable,
  userId: string,
  teamId: string,
  periodId: number,
): Promise<ReportRecord | null> {
  const result = await db.query(
    `SELECT r.id, r.period_id, r.workload, r.delivered_cnt, r.inflight_cnt, r.submitted_at, r.updated_at
     FROM reports r WHERE r.user_id = $1 AND r.team_id = $2 AND r.period_id = $3`,
    [userId, teamId, periodId],
  );
  if (result.rows.length === 0) return null;
  return loadReportBody(db, result.rows[0]);
}

export async function getReportById(
  db: Queryable,
  reportId: string,
): Promise<{ report: ReportRecord; userId: string; teamId: string } | null> {
  const result = await db.query(
    `SELECT r.id, r.period_id, r.workload, r.delivered_cnt, r.inflight_cnt, r.submitted_at, r.updated_at,
            r.user_id, r.team_id
     FROM reports r WHERE r.id = $1`,
    [reportId],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  const report = await loadReportBody(db, row);
  return { report, userId: row.user_id, teamId: row.team_id };
}

async function getPreviousReportRow(
  db: Queryable,
  userId: string,
  teamId: string,
  beforePeriodId: number,
): Promise<any | null> {
  const result = await db.query(
    `SELECT r.id, r.period_id, r.workload, r.delivered_cnt, r.inflight_cnt, r.submitted_at, r.updated_at
     FROM reports r WHERE r.user_id = $1 AND r.team_id = $2 AND r.period_id < $3
     ORDER BY r.period_id DESC LIMIT 1`,
    [userId, teamId, beforePeriodId],
  );
  return result.rows[0] ?? null;
}

export async function getPreviousReport(
  db: Queryable,
  userId: string,
  teamId: string,
  beforePeriodId: number,
): Promise<ReportRecord | null> {
  const row = await getPreviousReportRow(db, userId, teamId, beforePeriodId);
  if (!row) return null;
  return loadReportBody(db, row);
}

async function loadReportBody(db: Queryable, reportRow: any): Promise<ReportRecord> {
  const reportId = reportRow.id;

  const [cardsResult, itemsResult, opportunitiesResult] = await Promise.all([
    db.query(
      `SELECT id, title, description, status, sort_order FROM project_cards
       WHERE report_id = $1 ORDER BY sort_order`,
      [reportId],
    ),
    db.query(`SELECT id, kind, content, severity FROM report_items WHERE report_id = $1`, [reportId]),
    db.query(`SELECT id, type, content FROM opportunities WHERE report_id = $1`, [reportId]),
  ]);

  const projectCards: ProjectCard[] = cardsResult.rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    sortOrder: r.sort_order,
  }));

  const majorTasksDid = itemsResult.rows.filter((r: any) => r.kind === 'task_done').map((r: any) => r.content);
  const majorTasksToDo = itemsResult.rows.filter((r: any) => r.kind === 'task_upcoming').map((r: any) => r.content);
  const alerts = itemsResult.rows
    .filter((r: any) => r.kind === 'alert')
    .map((r: any) => ({ content: r.content, severity: r.severity as AlertSeverity }));

  const opportunities: Opportunity[] = opportunitiesResult.rows.map((r: any) => ({
    id: r.id,
    type: r.type,
    content: r.content,
  }));

  return {
    id: reportId,
    periodId: reportRow.period_id,
    workload: reportRow.workload,
    deliveredCnt: reportRow.delivered_cnt,
    inflightCnt: reportRow.inflight_cnt,
    submittedAt: reportRow.submitted_at,
    updatedAt: reportRow.updated_at,
    projectCards,
    majorTasksDid,
    majorTasksToDo,
    alerts,
    opportunities,
  };
}

/** Upserts the report row and replaces its repeatable child rows. Not run inside a DB transaction:
 * Queryable only exposes pool.query (no client checkout), matching the rest of this codebase. */
export async function upsertReport(
  db: Queryable,
  userId: string,
  teamId: string,
  periodId: number,
  payload: ReportWritePayload,
): Promise<ReportRecord> {
  const upsertResult = await db.query(
    `INSERT INTO reports (user_id, team_id, period_id, workload, delivered_cnt, inflight_cnt)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, team_id, period_id) DO UPDATE SET
       workload = EXCLUDED.workload,
       delivered_cnt = EXCLUDED.delivered_cnt,
       inflight_cnt = EXCLUDED.inflight_cnt,
       updated_at = now()
     RETURNING id`,
    [userId, teamId, periodId, payload.workload, payload.deliveredCnt, payload.inflightCnt],
  );
  const reportId = upsertResult.rows[0].id;

  await db.query(`DELETE FROM project_cards WHERE report_id = $1`, [reportId]);
  for (const card of payload.projectCards) {
    await db.query(
      `INSERT INTO project_cards (report_id, title, description, status, sort_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [reportId, card.title, card.description, card.status, card.sortOrder],
    );
  }

  await db.query(`DELETE FROM report_items WHERE report_id = $1`, [reportId]);
  for (const content of payload.majorTasksDid) {
    await db.query(`INSERT INTO report_items (report_id, kind, content, severity) VALUES ($1, 'task_done', $2, NULL)`, [
      reportId,
      content,
    ]);
  }
  for (const content of payload.majorTasksToDo) {
    await db.query(
      `INSERT INTO report_items (report_id, kind, content, severity) VALUES ($1, 'task_upcoming', $2, NULL)`,
      [reportId, content],
    );
  }
  for (const alert of payload.alerts) {
    await db.query(`INSERT INTO report_items (report_id, kind, content, severity) VALUES ($1, 'alert', $2, $3)`, [
      reportId,
      alert.content,
      alert.severity,
    ]);
  }

  await db.query(`DELETE FROM opportunities WHERE report_id = $1`, [reportId]);
  for (const opportunity of payload.opportunities) {
    await db.query(`INSERT INTO opportunities (report_id, type, content) VALUES ($1, $2, $3)`, [
      reportId,
      opportunity.type,
      opportunity.content,
    ]);
  }

  const saved = await getReportForPeriod(db, userId, teamId, periodId);
  return saved!;
}

export async function submitReport(
  db: Queryable,
  userId: string,
  teamId: string,
  periodId: number,
): Promise<ReportRecord | null> {
  const result = await db.query(
    `UPDATE reports SET submitted_at = now(), updated_at = now()
     WHERE user_id = $1 AND team_id = $2 AND period_id = $3
     RETURNING id`,
    [userId, teamId, periodId],
  );
  if (result.rows.length === 0) return null;
  return getReportForPeriod(db, userId, teamId, periodId);
}

function toPeriod(row: any): ReportPeriod {
  return {
    id: row.id,
    isoWeek: row.iso_week,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
  };
}
