import type { Queryable } from './pool.js';

export interface TeamMembershipRecord {
  teamId: string;
  role: 'member' | 'manager' | 'admin';
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
