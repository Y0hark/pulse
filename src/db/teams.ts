import type { Queryable } from './pool.js';
import type { TeamFreezeConfig } from '../dashboard/types.js';

export interface TeamMembershipRecord {
  teamId: string;
  role: 'member' | 'manager' | 'admin';
}

/** Teams whose freeze_mode allows the scheduled job to freeze them ('auto' or 'both'); 'manual' teams are excluded. */
export async function getAutoFreezeTeams(db: Queryable): Promise<TeamFreezeConfig[]> {
  const result = await db.query(
    `SELECT id, slug, timezone, freeze_dow, freeze_time, freeze_mode FROM teams WHERE freeze_mode IN ('auto', 'both')`,
  );
  return result.rows.map((r: any) => ({
    id: r.id,
    slug: r.slug,
    timezone: r.timezone,
    freezeDow: r.freeze_dow,
    freezeTime: r.freeze_time,
    freezeMode: r.freeze_mode,
  }));
}

export async function findTeamMembership(
  db: Queryable,
  teamSlug: string,
  userId: string,
): Promise<TeamMembershipRecord | null> {
  const result = await db.query(
    `SELECT t.id AS team_id, tm.role
     FROM teams t
     JOIN team_members tm ON tm.team_id = t.id
     WHERE t.slug = $1 AND tm.user_id = $2`,
    [teamSlug, userId],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return { teamId: row.team_id, role: row.role };
}
