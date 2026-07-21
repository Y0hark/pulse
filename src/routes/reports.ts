import { Router } from 'express';
import type { Queryable } from '../db/pool.js';
import {
  getCurrentPeriod,
  getPeriodById,
  getPeriodByIsoWeek,
  getPreviousReport,
  getReportById,
  getReportForPeriod,
  getTeamPeriodStatus,
  submitReport,
  upsertReport,
} from '../db/reports.js';
import { getUserById } from '../db/users.js';
import { buildDraftFromPrevious } from '../services/prefill.js';
import type { ReportWritePayload } from '../reports/types.js';

async function resolvePeriod(db: Queryable, isoWeek: unknown) {
  if (typeof isoWeek === 'string' && isoWeek.trim() !== '') {
    return getPeriodByIsoWeek(db, isoWeek);
  }
  return getCurrentPeriod(db);
}

function parsePayload(body: unknown): ReportWritePayload | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  const workload = Number(b.workload);
  if (!Number.isInteger(workload) || workload < 0 || workload > 100) return null;

  return {
    workload,
    deliveredCnt: Number.isInteger(b.deliveredCnt) ? (b.deliveredCnt as number) : 0,
    inflightCnt: Number.isInteger(b.inflightCnt) ? (b.inflightCnt as number) : 0,
    projectCards: Array.isArray(b.projectCards) ? (b.projectCards as ReportWritePayload['projectCards']) : [],
    majorTasksDid: Array.isArray(b.majorTasksDid) ? (b.majorTasksDid as string[]) : [],
    majorTasksToDo: Array.isArray(b.majorTasksToDo) ? (b.majorTasksToDo as string[]) : [],
    alerts: Array.isArray(b.alerts) ? (b.alerts as ReportWritePayload['alerts']) : [],
    opportunities: Array.isArray(b.opportunities) ? (b.opportunities as ReportWritePayload['opportunities']) : [],
  };
}

export function createReportsRouter(db: Queryable): Router {
  const router = Router();

  router.get('/teams/:team/periods/current', async (req, res) => {
    const period = await getCurrentPeriod(db);
    if (!period) {
      res.status(404).json({ error: 'no_current_period' });
      return;
    }

    const status = await getTeamPeriodStatus(db, req.teamId!, period.id);
    const existing = await getReportForPeriod(db, req.userId!, req.teamId!, period.id);
    const draft = existing ?? (await buildDraftFromPrevious(await getPreviousReport(db, req.userId!, req.teamId!, period.id)));

    res.status(200).json({ period, status, draft });
  });

  router.get('/teams/:team/reports/mine', async (req, res) => {
    const period = await resolvePeriod(db, req.query.period);
    if (!period) {
      res.status(404).json({ error: 'period_not_found' });
      return;
    }

    const report = await getReportForPeriod(db, req.userId!, req.teamId!, period.id);
    if (!report) {
      res.status(404).json({ error: 'report_not_found' });
      return;
    }
    res.status(200).json({ period, report });
  });

  router.put('/teams/:team/reports/mine', async (req, res) => {
    const period = await resolvePeriod(db, req.query.period);
    if (!period) {
      res.status(404).json({ error: 'period_not_found' });
      return;
    }

    const status = await getTeamPeriodStatus(db, req.teamId!, period.id);
    if (status === 'frozen') {
      res.status(409).json({ error: 'period_frozen' });
      return;
    }

    const payload = parsePayload(req.body);
    if (!payload) {
      res.status(400).json({ error: 'invalid_payload' });
      return;
    }

    const report = await upsertReport(db, req.userId!, req.teamId!, period.id, payload);
    res.status(200).json({ period, report });
  });

  router.post('/teams/:team/reports/mine/submit', async (req, res) => {
    const period = await resolvePeriod(db, req.query.period);
    if (!period) {
      res.status(404).json({ error: 'period_not_found' });
      return;
    }

    const status = await getTeamPeriodStatus(db, req.teamId!, period.id);
    if (status === 'frozen') {
      res.status(409).json({ error: 'period_frozen' });
      return;
    }

    const report = await submitReport(db, req.userId!, req.teamId!, period.id);
    if (!report) {
      res.status(404).json({ error: 'report_not_found' });
      return;
    }
    res.status(200).json({ period, report });
  });

  // Registered after the /reports/mine* routes above: ':reportId' would otherwise
  // greedily match the literal 'mine' segment first.
  router.get('/teams/:team/reports/:reportId', async (req, res) => {
    const found = await getReportById(db, req.params.reportId);
    // Same 404 whether the report doesn't exist or belongs to another team: avoids
    // leaking cross-team report ids to a team member probing the URL space.
    if (!found || found.teamId !== req.teamId) {
      res.status(404).json({ error: 'report_not_found' });
      return;
    }

    const [period, owner] = await Promise.all([
      getPeriodById(db, found.report.periodId),
      getUserById(db, found.userId),
    ]);
    const periodStatus = await getTeamPeriodStatus(db, req.teamId!, found.report.periodId);

    const isOwner = found.userId === req.userId;
    const canEdit = periodStatus === 'open' && (isOwner || req.teamRole === 'manager' || req.teamRole === 'admin');

    res.status(200).json({
      report: found.report,
      period,
      periodStatus,
      owner: owner ? { id: owner.id, displayName: owner.displayName ?? owner.email } : null,
      isOwner,
      canEdit,
    });
  });

  return router;
}
