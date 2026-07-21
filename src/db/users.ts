import type { Queryable } from './pool.js';

export interface TeamMembership {
  team: { id: string; name: string; slug: string };
  role: 'member' | 'manager' | 'admin';
}

export interface UserRecord {
  id: string;
  email: string;
  displayName: string | null;
  profile: { code: string; label: string } | null;
  isGlobalAdmin: boolean;
}

export interface UserWithTeams extends UserRecord {
  teams: TeamMembership[];
}

/** First successful login upserts the users row (auto-provisioning). */
export async function upsertUserByEmail(db: Queryable, email: string): Promise<UserRecord> {
  const result = await db.query(
    `INSERT INTO users (email)
     VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id, email, display_name, profile_id, is_global_admin`,
    [email],
  );
  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    profile: null,
    isGlobalAdmin: row.is_global_admin,
  };
}

export async function getUserById(
  db: Queryable,
  userId: string,
): Promise<{ id: string; email: string; displayName: string | null } | null> {
  const result = await db.query(`SELECT id, email, display_name FROM users WHERE id = $1`, [userId]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return { id: row.id, email: row.email, displayName: row.display_name };
}

export async function getUserWithTeams(db: Queryable, userId: string): Promise<UserWithTeams | null> {
  const userResult = await db.query(
    `SELECT u.id, u.email, u.display_name, u.is_global_admin, p.code AS profile_code, p.label AS profile_label
     FROM users u
     LEFT JOIN profiles p ON p.id = u.profile_id
     WHERE u.id = $1`,
    [userId],
  );
  if (userResult.rows.length === 0) return null;
  const row = userResult.rows[0];

  const teamsResult = await db.query(
    `SELECT t.id, t.name, t.slug, tm.role
     FROM team_members tm
     JOIN teams t ON t.id = tm.team_id
     WHERE tm.user_id = $1
     ORDER BY t.name`,
    [userId],
  );

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    profile: row.profile_code ? { code: row.profile_code, label: row.profile_label } : null,
    isGlobalAdmin: row.is_global_admin,
    teams: teamsResult.rows.map((r) => ({
      team: { id: r.id, name: r.name, slug: r.slug },
      role: r.role,
    })),
  };
}
