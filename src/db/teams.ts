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
  return result.rows.map(toFreezeConfig);
}

/** A single team's freeze config, keyed by id — used to compute per-period submission deadlines
 * for gamification (streak/XP), independent of that team's actual freeze_mode. */
export async function getTeamFreezeConfig(db: Queryable, teamId: string): Promise<TeamFreezeConfig | null> {
  const result = await db.query(
    `SELECT id, slug, timezone, freeze_dow, freeze_time, freeze_mode FROM teams WHERE id = $1`,
    [teamId],
  );
  if (result.rows.length === 0) return null;
  return toFreezeConfig(result.rows[0]);
}

function toFreezeConfig(r: any): TeamFreezeConfig {
  return {
    id: r.id,
    slug: r.slug,
    timezone: r.timezone,
    freezeDow: r.freeze_dow,
    freezeTime: r.freeze_time,
    freezeMode: r.freeze_mode,
  };
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

export async function setLeaderboardOptIn(db: Queryable, teamId: string, userId: string, optIn: boolean): Promise<void> {
  await db.query(`UPDATE team_members SET leaderboard_opt_in = $3 WHERE team_id = $1 AND user_id = $2`, [
    teamId,
    userId,
    optIn,
  ]);
}

export async function getLeaderboardOptIn(db: Queryable, teamId: string, userId: string): Promise<boolean> {
  const result = await db.query(`SELECT leaderboard_opt_in FROM team_members WHERE team_id = $1 AND user_id = $2`, [
    teamId,
    userId,
  ]);
  if (result.rows.length === 0) return false;
  return Boolean(result.rows[0].leaderboard_opt_in);
}

/** Members of a team who have opted in to the (name-visible, in-team-only) leaderboard. */
export async function getOptedInTeamMembers(db: Queryable, teamId: string): Promise<{ userId: string; displayName: string | null }[]> {
  const result = await db.query(
    `SELECT u.id, u.display_name
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = $1 AND tm.leaderboard_opt_in = true`,
    [teamId],
  );
  return result.rows.map((r: any) => ({ userId: r.id, displayName: r.display_name }));
}
