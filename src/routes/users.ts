import { Router } from 'express';
import type { AuthProvider } from '../auth/types.js';
import type { Queryable } from '../db/pool.js';
import { getMissionRecord, isGlobalAdmin, removeMissionMember, type MissionMember } from '../db/missions.js';
import {
  countGlobalAdmins,
  createUser,
  listUsers,
  setUserActive,
  setUserGlobalAdmin,
  setUserMissionRole,
  updateUser,
  type UserCreateInput,
  type UserUpdateInput,
} from '../db/users.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireGlobalAdmin } from '../middleware/requireGlobalAdmin.js';

const MISSION_ROLES: MissionMember['role'][] = ['member', 'manager', 'admin'];

function parseCreateInput(body: unknown): UserCreateInput | null {
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.email !== 'string' || b.email.trim() === '') return null;
  return {
    email: b.email.trim(),
    displayName: typeof b.displayName === 'string' ? b.displayName.trim() || null : null,
    profileId: typeof b.profileId === 'number' ? b.profileId : null,
  };
}

function parseUpdateInput(body: unknown): UserUpdateInput | null {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    displayName: typeof b.displayName === 'string' ? b.displayName.trim() || null : null,
    profileId: typeof b.profileId === 'number' ? b.profileId : null,
  };
}

/** Settings > Users: global-admin-only administration of the user directory
 * (create/edit/activate/deactivate, global-admin toggle, per-mission role assignment).
 * Distinct from /me (self-service) and /missions/:slug/members (adds by email at 'member' role). */
export function createUsersRouter(authProvider: AuthProvider, db: Queryable): Router {
  const router = Router();
  const auth = requireAuth(authProvider);
  const admin = requireGlobalAdmin(db);

  router.get('/users', auth, admin, async (_req, res) => {
    const users = await listUsers(db);
    res.status(200).json({ users });
  });

  router.post('/users', auth, admin, async (req, res) => {
    const input = parseCreateInput(req.body);
    if (!input) {
      res.status(400).json({ error: 'invalid_user' });
      return;
    }
    const user = await createUser(db, input);
    if (!user) {
      res.status(409).json({ error: 'email_taken' });
      return;
    }
    res.status(201).json({ user });
  });

  router.put('/users/:id', auth, admin, async (req, res) => {
    const input = parseUpdateInput(req.body);
    if (!input) {
      res.status(400).json({ error: 'invalid_user' });
      return;
    }
    await updateUser(db, req.params.id, input);
    res.status(200).json({ ok: true });
  });

  router.post('/users/:id/deactivate', auth, admin, async (req, res) => {
    if (await wouldZeroOutAdmins(db, req.params.id, false)) {
      res.status(400).json({ error: 'last_admin' });
      return;
    }
    await setUserActive(db, req.params.id, false);
    res.status(200).json({ ok: true });
  });

  router.post('/users/:id/activate', auth, admin, async (req, res) => {
    await setUserActive(db, req.params.id, true);
    res.status(200).json({ ok: true });
  });

  router.put('/users/:id/global-admin', auth, admin, async (req, res) => {
    const isGlobalAdmin = (req.body as Record<string, unknown> | null)?.isGlobalAdmin;
    if (typeof isGlobalAdmin !== 'boolean') {
      res.status(400).json({ error: 'invalid_input' });
      return;
    }
    if (!isGlobalAdmin && (await wouldZeroOutAdmins(db, req.params.id, isGlobalAdmin))) {
      res.status(400).json({ error: 'last_admin' });
      return;
    }
    await setUserGlobalAdmin(db, req.params.id, isGlobalAdmin);
    res.status(200).json({ ok: true });
  });

  router.put('/users/:id/missions/:teamSlug/role', auth, admin, async (req, res) => {
    const role = (req.body as Record<string, unknown> | null)?.role;
    if (typeof role !== 'string' || !MISSION_ROLES.includes(role as MissionMember['role'])) {
      res.status(400).json({ error: 'invalid_role' });
      return;
    }
    const mission = await getMissionRecord(db, req.params.teamSlug);
    if (!mission) {
      res.status(404).json({ error: 'mission_not_found' });
      return;
    }
    await setUserMissionRole(db, mission.id, req.params.id, role as MissionMember['role']);
    res.status(200).json({ ok: true });
  });

  router.delete('/users/:id/missions/:teamSlug', auth, admin, async (req, res) => {
    const mission = await getMissionRecord(db, req.params.teamSlug);
    if (!mission) {
      res.status(404).json({ error: 'mission_not_found' });
      return;
    }
    await removeMissionMember(db, mission.id, req.params.id);
    res.status(204).send();
  });

  return router;
}

/** True when applying this change to userId would leave the org with zero global admins. */
async function wouldZeroOutAdmins(db: Queryable, userId: string, willBeAdmin: boolean): Promise<boolean> {
  if (willBeAdmin) return false;
  const currentlyAdmin = await isGlobalAdmin(db, userId);
  if (!currentlyAdmin) return false;
  const total = await countGlobalAdmins(db);
  return total <= 1;
}
