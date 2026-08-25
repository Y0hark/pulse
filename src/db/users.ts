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

export interface UserAdminSummary {
  id: string;
  email: string;
  displayName: string | null;
  profile: { code: string; label: string } | null;
  isGlobalAdmin: boolean;
  isActive: boolean;
  missions: Array<{ id: string; name: string; slug: string; role: 'member' | 'manager' | 'admin' }>;
}

export interface UserCreateInput {
  email: string;
  displayName?: string | null;
  profileId?: number | null;
}

export interface UserUpdateInput {
  displayName?: string | null;
  profileId?: number | null;
}

/** First successful login upserts the users row (auto-provisioning). `bootstrapAdminEmail`
 * (BOOTSTRAP_ADMIN_EMAIL) is granted global admin the first time it logs in, so a fresh
 * deploy always has one usable admin account without a manual DB edit. */
export async function upsertUserByEmail(
  db: Queryable,
  email: string,
  bootstrapAdminEmail?: string,
): Promise<UserRecord> {
  // Normalize here (not just at the login callsite) so every caller — admin "add member"
  // forms included — lands on the same row a user's magic-link login resolves to. Without
  // this, an admin typing "Sam@x.com" while the user logs in as "sam@x.com" silently created
  // two separate users rows, leaving the real account with no team_members row.
  const normalizedEmail = email.trim().toLowerCase();
  const isBootstrapAdmin = !!bootstrapAdminEmail && normalizedEmail === bootstrapAdminEmail.toLowerCase();
  const result = await db.query(
    `INSERT INTO users (email, is_global_admin)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE
       SET email = EXCLUDED.email,
           is_global_admin = CASE WHEN $2 THEN true ELSE users.is_global_admin END
     RETURNING id, email, display_name, profile_id, is_global_admin`,
    [normalizedEmail, isBootstrapAdmin],
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

/** Login-time lookup: finds an existing, active user by email without creating one.
 * Used to gate magic-link sign-in on admin-managed registration (see resolveLoginUser). */
export async function findActiveUserByEmail(db: Queryable, email: string): Promise<UserRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await db.query(
    `SELECT id, email, display_name, is_global_admin FROM users WHERE email = $1 AND is_active = true`,
    [normalizedEmail],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return { id: row.id, email: row.email, displayName: row.display_name, profile: null, isGlobalAdmin: row.is_global_admin };
}

/** Gates magic-link sign-in: only the bootstrap admin can self-provision (so a fresh deploy
 * always has one usable account); everyone else must already have a `users` row created by an
 * admin (Settings > Users, or a mission member invite). Returns null when sign-in should be
 * refused — callers must not create a session or send a link in that case. */
export async function resolveLoginUser(
  db: Queryable,
  email: string,
  bootstrapAdminEmail?: string,
): Promise<UserRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const isBootstrapAdmin = !!bootstrapAdminEmail && normalizedEmail === bootstrapAdminEmail.toLowerCase();
  if (isBootstrapAdmin) return upsertUserByEmail(db, normalizedEmail, bootstrapAdminEmail);
  return findActiveUserByEmail(db, normalizedEmail);
}

export async function updateDisplayName(db: Queryable, userId: string, displayName: string): Promise<void> {
  await db.query(`UPDATE users SET display_name = $1 WHERE id = $2`, [displayName, userId]);
}

export async function getUserById(
  db: Queryable,
  userId: string,
): Promise<{ id: string; email: string; displayName: string | null; profile: { code: string; label: string } | null } | null> {
  const result = await db.query(
    `SELECT u.id, u.email, u.display_name, p.code AS profile_code, p.label AS profile_label
     FROM users u
     LEFT JOIN profiles p ON p.id = u.profile_id
     WHERE u.id = $1`,
    [userId],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    profile: row.profile_code ? { code: row.profile_code, label: row.profile_label } : null,
  };
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

  // Global admins are implicitly 'admin' on every team (see requireTeamMember), so their
  // team list must include all teams, not just ones with an actual team_members row.
  const teamsResult = row.is_global_admin
    ? await db.query(`SELECT id, name, slug, 'admin' AS role FROM teams ORDER BY name`)
    : await db.query(
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

/** Settings > Users listing: every user with their global-admin/active flags and mission roles. */
export async function listUsers(db: Queryable): Promise<UserAdminSummary[]> {
  const usersResult = await db.query(
    `SELECT u.id, u.email, u.display_name, u.is_global_admin, u.is_active, p.code AS profile_code, p.label AS profile_label
     FROM users u
     LEFT JOIN profiles p ON p.id = u.profile_id
     ORDER BY u.display_name, u.email`,
  );
  const missionsResult = await db.query(
    `SELECT tm.user_id, t.id AS team_id, t.name, t.slug, tm.role
     FROM team_members tm
     JOIN teams t ON t.id = tm.team_id`,
  );

  return usersResult.rows.map((row: any) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    profile: row.profile_code ? { code: row.profile_code, label: row.profile_label } : null,
    isGlobalAdmin: row.is_global_admin,
    isActive: row.is_active,
    missions: missionsResult.rows
      .filter((m: any) => m.user_id === row.id)
      .map((m: any) => ({ id: m.team_id, name: m.name, slug: m.slug, role: m.role })),
  }));
}

/** Admin-initiated creation, unlike upsertUserByEmail which only fires on first login. */
export async function createUser(db: Queryable, input: UserCreateInput): Promise<UserRecord | null> {
  const existing = await db.query(`SELECT 1 FROM users WHERE email = $1`, [input.email]);
  if (existing.rows.length > 0) return null;

  const result = await db.query(
    `INSERT INTO users (email, display_name, profile_id)
     VALUES ($1, $2, $3)
     RETURNING id, email, display_name, profile_id, is_global_admin`,
    [input.email, input.displayName ?? null, input.profileId ?? null],
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

export async function updateUser(db: Queryable, userId: string, input: UserUpdateInput): Promise<void> {
  await db.query(`UPDATE users SET display_name = $2, profile_id = $3 WHERE id = $1`, [
    userId,
    input.displayName ?? null,
    input.profileId ?? null,
  ]);
}

export async function setUserActive(db: Queryable, userId: string, isActive: boolean): Promise<void> {
  await db.query(`UPDATE users SET is_active = $2 WHERE id = $1`, [userId, isActive]);
}

export async function setUserGlobalAdmin(db: Queryable, userId: string, isGlobalAdmin: boolean): Promise<void> {
  await db.query(`UPDATE users SET is_global_admin = $2 WHERE id = $1`, [userId, isGlobalAdmin]);
}

export interface ProfileOption {
  id: number;
  code: string;
  label: string;
}

/** The Job/profile picker's options — real DB ids (not the app-level PROFILE_DEFS constant,
 * which has no ids), since profile_id is a genuine FK on users. */
export async function listProfiles(db: Queryable): Promise<ProfileOption[]> {
  const result = await db.query(`SELECT id, code, label FROM profiles ORDER BY sort_order, label`, []);
  return result.rows.map((row: any) => ({ id: row.id, code: row.code, label: row.label }));
}

export async function countGlobalAdmins(db: Queryable): Promise<number> {
  const result = await db.query(`SELECT COUNT(*) AS count FROM users WHERE is_global_admin = true`, []);
  return Number(result.rows[0].count);
}

/** Upserts a user's role on a mission without touching other memberships (unlike
 * addMissionMember in db/missions.ts, which always inserts at the default 'member' role). */
export async function setUserMissionRole(
  db: Queryable,
  teamId: string,
  userId: string,
  role: 'member' | 'manager' | 'admin',
): Promise<void> {
  await db.query(
    `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)
     ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [teamId, userId, role],
  );
}
