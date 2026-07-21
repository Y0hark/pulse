import { Router } from 'express';
import type { AuthProvider } from '../auth/types.js';
import type { Queryable } from '../db/pool.js';
import { getCurrentPeriod, getPeriodByIsoWeek } from '../db/reports.js';
import { getConsolidatedReport } from '../services/aggregation.js';
import {
  addMissionMember,
  createMission,
  getMissionDetail,
  getMissionRecord,
  listMissions,
  removeMissionMember,
  setMissionStatus,
  updateMissionSettings,
  type FreezeMode,
  type MissionInput,
  type MissionUpdateInput,
  type ReportingFrequency,
} from '../db/missions.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireGlobalAdmin } from '../middleware/requireGlobalAdmin.js';

const REPORTING_FREQUENCIES: ReportingFrequency[] = ['weekly', 'biweekly', 'monthly'];
const FREEZE_MODES: FreezeMode[] = ['auto', 'manual', 'both'];

function parseMissionInput(body: unknown): MissionInput | null {
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.name !== 'string' || b.name.trim() === '') return null;
  if (b.reportingFrequency !== undefined && !REPORTING_FREQUENCIES.includes(b.reportingFrequency as ReportingFrequency)) {
    return null;
  }
  if (b.freezeMode !== undefined && !FREEZE_MODES.includes(b.freezeMode as FreezeMode)) return null;
  if (b.freezeDow !== undefined && (!Number.isInteger(b.freezeDow) || (b.freezeDow as number) < 1 || (b.freezeDow as number) > 7)) {
    return null;
  }

  return {
    name: b.name.trim(),
    clientName: typeof b.clientName === 'string' ? b.clientName.trim() || null : null,
    timezone: typeof b.timezone === 'string' ? b.timezone : undefined,
    startsOn: typeof b.startsOn === 'string' ? b.startsOn : null,
    endsOn: typeof b.endsOn === 'string' ? b.endsOn : null,
    reportingFrequency: b.reportingFrequency as ReportingFrequency | undefined,
    freezeDow: b.freezeDow as number | undefined,
    freezeTime: typeof b.freezeTime === 'string' ? b.freezeTime : undefined,
    freezeMode: b.freezeMode as FreezeMode | undefined,
    memberEmails: Array.isArray(b.memberEmails) ? b.memberEmails.filter((e) => typeof e === 'string') : undefined,
  };
}

function parseMissionUpdateInput(body: unknown): MissionUpdateInput | null {
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.name !== 'string' || b.name.trim() === '') return null;
  if (typeof b.timezone !== 'string' || b.timezone.trim() === '') return null;
  if (!REPORTING_FREQUENCIES.includes(b.reportingFrequency as ReportingFrequency)) return null;
  if (!FREEZE_MODES.includes(b.freezeMode as FreezeMode)) return null;
  if (!Number.isInteger(b.freezeDow) || (b.freezeDow as number) < 1 || (b.freezeDow as number) > 7) return null;
  if (typeof b.freezeTime !== 'string' || b.freezeTime.trim() === '') return null;

  return {
    name: b.name.trim(),
    clientName: typeof b.clientName === 'string' ? b.clientName.trim() || null : null,
    timezone: b.timezone,
    startsOn: typeof b.startsOn === 'string' ? b.startsOn : null,
    endsOn: typeof b.endsOn === 'string' ? b.endsOn : null,
    reportingFrequency: b.reportingFrequency as ReportingFrequency,
    freezeDow: b.freezeDow as number,
    freezeTime: b.freezeTime,
    freezeMode: b.freezeMode as FreezeMode,
  };
}

/** Missions are today's `teams` seen through a management lens (name/client/period/reporting
 * cadence/status). Routes are global (no :team-scoped requireTeamMember) since a user browsing
 * or an admin managing missions isn't necessarily already a member of the one they're viewing. */
export function createMissionsRouter(authProvider: AuthProvider, db: Queryable): Router {
  const router = Router();
  const auth = requireAuth(authProvider);
  const admin = requireGlobalAdmin(db);

  router.get('/missions', auth, async (_req, res) => {
    const missions = await listMissions(db);
    res.status(200).json({ missions });
  });

  // Registered before '/missions/:slug' so the literal 'consolidated-report' segment
  // isn't swallowed by the ':slug' param.
  router.get('/missions/consolidated-report', auth, async (req, res) => {
    const isoWeek = req.query.period;
    const period =
      typeof isoWeek === 'string' && isoWeek.trim() !== '' ? await getPeriodByIsoWeek(db, isoWeek) : await getCurrentPeriod(db);
    if (!period) {
      res.status(404).json({ error: 'period_not_found' });
      return;
    }

    const report = await getConsolidatedReport(db, period.id);
    res.status(200).json({ period, report });
  });

  router.get('/missions/:slug', auth, async (req, res) => {
    const period = await getCurrentPeriod(db);
    const mission = await getMissionDetail(db, req.params.slug, period?.id ?? null);
    if (!mission) {
      res.status(404).json({ error: 'mission_not_found' });
      return;
    }
    res.status(200).json({ mission });
  });

  router.post('/missions', auth, admin, async (req, res) => {
    const input = parseMissionInput(req.body);
    if (!input) {
      res.status(400).json({ error: 'invalid_mission' });
      return;
    }
    const mission = await createMission(db, input);
    res.status(201).json({ mission });
  });

  router.put('/missions/:slug', auth, admin, async (req, res) => {
    const input = parseMissionUpdateInput(req.body);
    if (!input) {
      res.status(400).json({ error: 'invalid_mission' });
      return;
    }
    const mission = await updateMissionSettings(db, req.params.slug, input);
    if (!mission) {
      res.status(404).json({ error: 'mission_not_found' });
      return;
    }
    res.status(200).json({ mission });
  });

  router.post('/missions/:slug/archive', auth, admin, async (req, res) => {
    const mission = await setMissionStatus(db, req.params.slug, 'archived');
    if (!mission) {
      res.status(404).json({ error: 'mission_not_found' });
      return;
    }
    res.status(200).json({ mission });
  });

  router.post('/missions/:slug/activate', auth, admin, async (req, res) => {
    const mission = await setMissionStatus(db, req.params.slug, 'active');
    if (!mission) {
      res.status(404).json({ error: 'mission_not_found' });
      return;
    }
    res.status(200).json({ mission });
  });

  router.post('/missions/:slug/members', auth, admin, async (req, res) => {
    const email = (req.body as Record<string, unknown> | null)?.email;
    if (typeof email !== 'string' || email.trim() === '') {
      res.status(400).json({ error: 'invalid_email' });
      return;
    }
    const mission = await getMissionRecord(db, req.params.slug);
    if (!mission) {
      res.status(404).json({ error: 'mission_not_found' });
      return;
    }
    const member = await addMissionMember(db, mission.id, email.trim());
    res.status(201).json({ member });
  });

  router.delete('/missions/:slug/members/:userId', auth, admin, async (req, res) => {
    const mission = await getMissionRecord(db, req.params.slug);
    if (!mission) {
      res.status(404).json({ error: 'mission_not_found' });
      return;
    }
    await removeMissionMember(db, mission.id, req.params.userId);
    res.status(204).send();
  });

  return router;
}
