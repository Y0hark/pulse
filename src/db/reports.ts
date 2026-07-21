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
import type { DashboardAggregate, PeriodSnapshot } from '../dashboard/types.js';

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

/** Periods that have already ended (ends_on <= before) but aren't yet frozen for this team —
 * i.e. candidates the scheduled auto-freeze job still needs to check. */
export async function getUnfrozenEndedPeriods(db: Queryable, teamId: string, before: Date): Promise<ReportPeriod[]> {
  const result = await db.query(
    `SELECT p.id, p.iso_week, p.starts_on, p.ends_on
     FROM report_periods p
     LEFT JOIN team_period_status s ON s.team_id = $1 AND s.period_id = p.id
     WHERE p.ends_on <= $2 AND (s.status IS NULL OR s.status != 'frozen')
     ORDER BY p.ends_on ASC`,
    [teamId, before],
  );
  return result.rows.map(toPeriod);
}

export async function getPeriodSnapshot(db: Queryable, teamId: string, periodId: number): Promise<PeriodSnapshot | null> {
  const result = await db.query(
    `SELECT team_id, period_id, payload, frozen_at FROM period_snapshots WHERE team_id = $1 AND period_id = $2`,
    [teamId, periodId],
  );
  if (result.rows.length === 0) return null;
  return toSnapshot(result.rows[0]);
}

/** Insert-only, keyed by (team_id, period_id): if another call already froze this period, the
 * conflict is a no-op and the existing (first-writer) snapshot is returned instead. This is what
 * makes freezing idempotent under concurrent requests without needing a transaction. */
export async function insertPeriodSnapshotIfAbsent(
  db: Queryable,
  teamId: string,
  periodId: number,
  payload: DashboardAggregate,
): Promise<PeriodSnapshot> {
  const inserted = await db.query(
    `INSERT INTO period_snapshots (team_id, period_id, payload)
     VALUES ($1, $2, $3)
     ON CONFLICT (team_id, period_id) DO NOTHING
     RETURNING team_id, period_id, payload, frozen_at`,
    [teamId, periodId, JSON.stringify(payload)],
  );
  if (inserted.rows.length > 0) return toSnapshot(inserted.rows[0]);

  const existing = await getPeriodSnapshot(db, teamId, periodId);
  return existing!;
}

function toSnapshot(row: any): PeriodSnapshot {
  return {
    teamId: row.team_id,
    periodId: row.period_id,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    frozenAt: row.frozen_at,
  };
}

export interface SubmissionHistoryRow {
  periodId: number;
  isoWeek: string;
  endsOn: string;
  submittedAt: string | null;
}

/** A user's submission history for one team, most recent period first, capped at `limit` — the
 * raw material for streak/XP computation (src/services/gamification.ts turns it into deadlines)
 * and for the user-facing history list (src/routes/reports.ts `/reports/mine/history`). */
export async function getSubmissionHistory(
  db: Queryable,
  userId: string,
  teamId: string,
  uptoPeriodId: number,
  limit = 12,
): Promise<SubmissionHistoryRow[]> {
  const result = await db.query(
    `SELECT p.id, p.iso_week, p.ends_on, r.submitted_at
     FROM report_periods p
     LEFT JOIN reports r ON r.period_id = p.id AND r.user_id = $1 AND r.team_id = $2
     WHERE p.id <= $3
     ORDER BY p.id DESC
     LIMIT $4`,
    [userId, teamId, uptoPeriodId, limit],
  );
  return result.rows.map((r: any) => ({
    periodId: r.id,
    isoWeek: r.iso_week,
    endsOn: r.ends_on,
    submittedAt: r.submitted_at,
  }));
}

/** Periods this team has frozen, most recent first — the raw material for the historical-report
 * list view (each entry links through to that period's already-frozen snapshot). */
export async function getFrozenPeriodsForTeam(
  db: Queryable,
  teamId: string,
  limit = 24,
): Promise<{ period: ReportPeriod; frozenAt: string }[]> {
  const result = await db.query(
    `SELECT p.id, p.iso_week, p.starts_on, p.ends_on, s.frozen_at
     FROM report_periods p
     JOIN team_period_status s ON s.period_id = p.id AND s.team_id = $1
     WHERE s.status = 'frozen'
     ORDER BY p.id DESC
     LIMIT $2`,
    [teamId, limit],
  );
  return result.rows.map((r: any) => ({ period: toPeriod(r), frozenAt: r.frozen_at }));
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
