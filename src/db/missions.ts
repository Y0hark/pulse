import type { Queryable } from './pool.js';
import { upsertUserByEmail } from './users.js';

export type MissionStatus = 'active' | 'archived';
export type ReportingFrequency = 'weekly' | 'biweekly' | 'monthly';
export type FreezeMode = 'auto' | 'manual' | 'both';

export interface MissionSummary {
  id: string;
  name: string;
  slug: string;
  clientName: string | null;
  status: MissionStatus;
  reportingFrequency: ReportingFrequency;
  memberCount: number;
}

export interface MissionRecord {
  id: string;
  name: string;
  slug: string;
  clientName: string | null;
  status: MissionStatus;
  reportingFrequency: ReportingFrequency;
  timezone: string;
  startsOn: string | null;
  endsOn: string | null;
  freezeDow: number;
  freezeTime: string;
  freezeMode: FreezeMode;
  archivedAt: string | null;
  createdAt: string;
}

export interface MissionMember {
  userId: string;
  email: string;
  displayName: string | null;
  role: 'member' | 'manager' | 'admin';
}

export interface MissionRecentReport {
  id: string;
  periodId: number;
  isoWeek: string;
  ownerDisplayName: string | null;
  ownerEmail: string;
  submittedAt: string | null;
  updatedAt: string;
}

export interface MissionDetail extends MissionRecord {
  memberCount: number;
  members: MissionMember[];
  recentReports: MissionRecentReport[];
  completion: { submitted: number; total: number } | null;
}

export interface MissionInput {
  name: string;
  clientName?: string | null;
  timezone?: string;
  startsOn?: string | null;
  endsOn?: string | null;
  reportingFrequency?: ReportingFrequency;
  freezeDow?: number;
  freezeTime?: string;
  freezeMode?: FreezeMode;
  memberEmails?: string[];
}

export interface MissionUpdateInput {
  name: string;
  clientName?: string | null;
  timezone: string;
  startsOn?: string | null;
  endsOn?: string | null;
  reportingFrequency: ReportingFrequency;
  freezeDow: number;
  freezeTime: string;
  freezeMode: FreezeMode;
}

export async function isGlobalAdmin(db: Queryable, userId: string): Promise<boolean> {
  const result = await db.query(`SELECT is_global_admin FROM users WHERE id = $1`, [userId]);
  if (result.rows.length === 0) return false;
  return Boolean(result.rows[0].is_global_admin);
}

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'mission';
}

async function findAvailableSlug(db: Queryable, name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;
  for (;;) {
    const existing = await db.query(`SELECT 1 FROM teams WHERE slug = $1`, [candidate]);
    if (existing.rows.length === 0) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function listMissions(db: Queryable): Promise<MissionSummary[]> {
  const result = await db.query(
    `SELECT t.id, t.name, t.slug, t.client_name, t.status, t.reporting_frequency,
            (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count
     FROM teams t
     ORDER BY t.name`,
  );
  return result.rows.map(toSummary);
}

export async function getMissionRecord(db: Queryable, slug: string): Promise<MissionRecord | null> {
  const result = await db.query(
    `SELECT id, name, slug, client_name, timezone, starts_on, ends_on, reporting_frequency,
            freeze_dow, freeze_time, freeze_mode, status, archived_at, created_at
     FROM teams WHERE slug = $1`,
    [slug],
  );
  if (result.rows.length === 0) return null;
  return toRecord(result.rows[0]);
}

export async function getMissionDetail(db: Queryable, slug: string, currentPeriodId: number | null): Promise<MissionDetail | null> {
  const mission = await getMissionRecord(db, slug);
  if (!mission) return null;

  const membersResult = await db.query(
    `SELECT u.id, u.email, u.display_name, tm.role
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = $1
     ORDER BY u.display_name, u.email`,
    [mission.id],
  );
  const members: MissionMember[] = membersResult.rows.map((r: any) => ({
    userId: r.id,
    email: r.email,
    displayName: r.display_name,
    role: r.role,
  }));

  const recentResult = await db.query(
    `SELECT r.id, r.period_id, r.submitted_at, r.updated_at, u.display_name, u.email, p.iso_week
     FROM reports r
     JOIN users u ON u.id = r.user_id
     JOIN report_periods p ON p.id = r.period_id
     WHERE r.team_id = $1
     ORDER BY r.updated_at DESC
     LIMIT 5`,
    [mission.id],
  );
  const recentReports: MissionRecentReport[] = recentResult.rows.map((r: any) => ({
    id: r.id,
    periodId: r.period_id,
    isoWeek: r.iso_week,
    ownerDisplayName: r.display_name,
    ownerEmail: r.email,
    submittedAt: r.submitted_at,
    updatedAt: r.updated_at,
  }));

  let completion: { submitted: number; total: number } | null = null;
  if (currentPeriodId !== null) {
    const totalResult = await db.query(`SELECT COUNT(*) AS total FROM team_members WHERE team_id = $1`, [mission.id]);
    const submittedResult = await db.query(
      `SELECT COUNT(*) AS submitted FROM reports WHERE team_id = $1 AND period_id = $2 AND submitted_at IS NOT NULL`,
      [mission.id, currentPeriodId],
    );
    completion = {
      submitted: Number(submittedResult.rows[0].submitted),
      total: Number(totalResult.rows[0].total),
    };
  }

  return { ...mission, memberCount: members.length, members, recentReports, completion };
}

export async function createMission(db: Queryable, input: MissionInput): Promise<MissionRecord> {
  const slug = await findAvailableSlug(db, input.name);
  const result = await db.query(
    `INSERT INTO teams (name, slug, client_name, timezone, starts_on, ends_on, reporting_frequency, freeze_dow, freeze_time, freeze_mode, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
     RETURNING id, name, slug, client_name, timezone, starts_on, ends_on, reporting_frequency,
               freeze_dow, freeze_time, freeze_mode, status, archived_at, created_at`,
    [
      input.name,
      slug,
      input.clientName ?? null,
      input.timezone ?? 'Europe/Paris',
      input.startsOn ?? null,
      input.endsOn ?? null,
      input.reportingFrequency ?? 'weekly',
      input.freezeDow ?? 2,
      input.freezeTime ?? '09:30',
      input.freezeMode ?? 'both',
    ],
  );
  const mission = toRecord(result.rows[0]);

  for (const email of input.memberEmails ?? []) {
    const user = await upsertUserByEmail(db, email);
    await db.query(
      `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT (team_id, user_id) DO NOTHING`,
      [mission.id, user.id],
    );
  }

  return mission;
}

export async function updateMissionSettings(
  db: Queryable,
  slug: string,
  input: MissionUpdateInput,
): Promise<MissionRecord | null> {
  const result = await db.query(
    `UPDATE teams SET
       name = $2, client_name = $3, timezone = $4, starts_on = $5, ends_on = $6,
       reporting_frequency = $7, freeze_dow = $8, freeze_time = $9, freeze_mode = $10
     WHERE slug = $1
     RETURNING id, name, slug, client_name, timezone, starts_on, ends_on, reporting_frequency,
               freeze_dow, freeze_time, freeze_mode, status, archived_at, created_at`,
    [
      slug,
      input.name,
      input.clientName ?? null,
      input.timezone,
      input.startsOn ?? null,
      input.endsOn ?? null,
      input.reportingFrequency,
      input.freezeDow,
      input.freezeTime,
      input.freezeMode,
    ],
  );
  if (result.rows.length === 0) return null;
  return toRecord(result.rows[0]);
}

export async function setMissionStatus(db: Queryable, slug: string, status: MissionStatus): Promise<MissionRecord | null> {
  const result = await db.query(
    `UPDATE teams SET status = $2, archived_at = CASE WHEN $2 = 'archived' THEN now() ELSE NULL END
     WHERE slug = $1
     RETURNING id, name, slug, client_name, timezone, starts_on, ends_on, reporting_frequency,
               freeze_dow, freeze_time, freeze_mode, status, archived_at, created_at`,
    [slug, status],
  );
  if (result.rows.length === 0) return null;
  return toRecord(result.rows[0]);
}

export async function addMissionMember(db: Queryable, teamId: string, email: string): Promise<MissionMember> {
  const user = await upsertUserByEmail(db, email);
  await db.query(
    `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT (team_id, user_id) DO NOTHING`,
    [teamId, user.id],
  );
  return { userId: user.id, email: user.email, displayName: user.displayName, role: 'member' };
}

export async function removeMissionMember(db: Queryable, teamId: string, userId: string): Promise<void> {
  await db.query(`DELETE FROM team_members WHERE team_id = $1 AND user_id = $2`, [teamId, userId]);
}

function toSummary(row: any): MissionSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    clientName: row.client_name,
    status: row.status,
    reportingFrequency: row.reporting_frequency,
    memberCount: Number(row.member_count),
  };
}

function toRecord(row: any): MissionRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    clientName: row.client_name,
    status: row.status,
    reportingFrequency: row.reporting_frequency,
    timezone: row.timezone,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    freezeDow: row.freeze_dow,
    freezeTime: row.freeze_time,
    freezeMode: row.freeze_mode,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}
