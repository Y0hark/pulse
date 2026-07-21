import { randomUUID } from 'node:crypto';
import type { Queryable } from '../src/db/pool.js';

interface TokenRow {
  id: string;
  email: string;
  token_hash: string;
  expires_at: Date;
  consumed_at: Date | null;
}

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  profile_id: number | null;
  profile_code: string | null;
  is_global_admin: boolean;
}

interface TeamRow {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  freeze_dow: number;
  freeze_time: string;
  freeze_mode: string;
  client_name: string | null;
  starts_on: string | null;
  ends_on: string | null;
  reporting_frequency: string;
  status: string;
  archived_at: Date | null;
  created_at: Date;
}

interface TeamMemberRow {
  team_id: string;
  user_id: string;
  role: string;
  leaderboard_opt_in: boolean;
}

interface PeriodRow {
  id: number;
  iso_week: string;
  starts_on: string;
  ends_on: string;
}

interface TeamPeriodStatusRow {
  team_id: string;
  period_id: number;
  status: string;
}

interface PeriodSnapshotRow {
  team_id: string;
  period_id: number;
  payload: unknown;
  frozen_at: Date;
}

interface ReportRow {
  id: string;
  user_id: string;
  team_id: string;
  period_id: number;
  workload: number;
  delivered_cnt: number;
  inflight_cnt: number;
  submitted_at: Date | null;
  updated_at: Date;
}

interface ProjectCardRow {
  id: string;
  report_id: string;
  title: string;
  description: string | null;
  status: string;
  sort_order: number;
}

interface ReportItemRow {
  id: string;
  report_id: string;
  kind: string;
  content: string;
  severity: string | null;
}

interface OpportunityRow {
  id: string;
  report_id: string;
  type: string;
  content: string;
}

/**
 * In-memory stand-in for the Postgres pool, matching only the query shapes
 * that src/auth, src/db/users.ts, src/db/teams.ts, and src/db/reports.ts
 * actually issue. Keeps route/service tests fast and free of a real database.
 */
export class FakeDb implements Queryable {
  readonly tokens: TokenRow[] = [];
  readonly users: UserRow[] = [];
  readonly teams: TeamRow[] = [];
  readonly teamMembers: TeamMemberRow[] = [];
  readonly periods: PeriodRow[] = [];
  readonly teamPeriodStatus: TeamPeriodStatusRow[] = [];
  readonly periodSnapshots: PeriodSnapshotRow[] = [];
  readonly reports: ReportRow[] = [];
  readonly projectCards: ProjectCardRow[] = [];
  readonly reportItems: ReportItemRow[] = [];
  readonly opportunities: OpportunityRow[] = [];

  // --- test-only seed helpers (not SQL-backed) ---

  seedTeam(
    slug: string,
    freezeConfig: {
      name?: string;
      timezone?: string;
      freezeDow?: number;
      freezeTime?: string;
      freezeMode?: string;
      clientName?: string | null;
      status?: string;
    } = {},
  ): TeamRow {
    const row = {
      id: randomUUID(),
      name: freezeConfig.name ?? slug,
      slug,
      timezone: freezeConfig.timezone ?? 'Europe/Paris',
      freeze_dow: freezeConfig.freezeDow ?? 2,
      freeze_time: freezeConfig.freezeTime ?? '09:30',
      freeze_mode: freezeConfig.freezeMode ?? 'both',
      client_name: freezeConfig.clientName ?? null,
      starts_on: null,
      ends_on: null,
      reporting_frequency: 'weekly',
      status: freezeConfig.status ?? 'active',
      archived_at: null,
      created_at: new Date(),
    };
    this.teams.push(row);
    return row;
  }

  seedUser(
    id: string,
    email: string,
    displayName: string | null = null,
    profileCode: string | null = null,
    isGlobalAdmin = false,
  ): UserRow {
    const row = {
      id,
      email,
      display_name: displayName,
      profile_id: null,
      profile_code: profileCode,
      is_global_admin: isGlobalAdmin,
    };
    this.users.push(row);
    return row;
  }

  addMember(teamId: string, userId: string, role = 'member'): void {
    this.teamMembers.push({ team_id: teamId, user_id: userId, role, leaderboard_opt_in: false });
  }

  seedPeriod(isoWeek: string, startsOn: string, endsOn: string): PeriodRow {
    const row = { id: this.periods.length + 1, iso_week: isoWeek, starts_on: startsOn, ends_on: endsOn };
    this.periods.push(row);
    return row;
  }

  freezePeriod(teamId: string, periodId: number): void {
    const existing = this.teamPeriodStatus.find((s) => s.team_id === teamId && s.period_id === periodId);
    if (existing) existing.status = 'frozen';
    else this.teamPeriodStatus.push({ team_id: teamId, period_id: periodId, status: 'frozen' });
  }

  async query(text: string, params: unknown[] = []): Promise<{ rows: any[] }> {
    const sql = text.trim();

    if (sql.startsWith('INSERT INTO magic_link_tokens')) {
      const [email, tokenHash, expiresAt] = params as [string, string, Date];
      this.tokens.push({ id: randomUUID(), email, token_hash: tokenHash, expires_at: expiresAt, consumed_at: null });
      return { rows: [] };
    }

    if (sql.startsWith('SELECT id, email, expires_at, consumed_at FROM magic_link_tokens')) {
      const [tokenHash] = params as [string];
      const row = this.tokens.find((t) => t.token_hash === tokenHash);
      return { rows: row ? [row] : [] };
    }

    if (sql.startsWith('UPDATE magic_link_tokens SET consumed_at')) {
      const [id] = params as [string];
      const row = this.tokens.find((t) => t.id === id);
      if (!row || row.consumed_at) return { rows: [] };
      row.consumed_at = new Date();
      return { rows: [{ id: row.id }] };
    }

    if (sql.startsWith('INSERT INTO users')) {
      const [email] = params as [string];
      let row = this.users.find((u) => u.email === email);
      if (!row) {
        row = { id: randomUUID(), email, display_name: null, profile_id: null, profile_code: null, is_global_admin: false };
        this.users.push(row);
      }
      return { rows: [row] };
    }

    if (sql.startsWith('SELECT u.id, u.email, u.display_name, u.is_global_admin')) {
      const [userId] = params as [string];
      const row = this.users.find((u) => u.id === userId);
      if (!row) return { rows: [] };
      return { rows: [{ ...row, profile_code: null, profile_label: null }] };
    }

    if (sql.startsWith('SELECT id, email, display_name FROM users WHERE id = $1')) {
      const [userId] = params as [string];
      const row = this.users.find((u) => u.id === userId);
      if (!row) return { rows: [] };
      return { rows: [{ id: row.id, email: row.email, display_name: row.display_name }] };
    }

    if (sql.startsWith('SELECT t.id, t.name, t.slug, tm.role')) {
      return { rows: [] };
    }

    if (sql.startsWith('SELECT u.id, u.display_name, p.code AS profile_code')) {
      const [teamId] = params as [string];
      const memberIds = new Set(this.teamMembers.filter((m) => m.team_id === teamId).map((m) => m.user_id));
      const rows = this.users
        .filter((u) => memberIds.has(u.id))
        .map((u) => ({ id: u.id, display_name: u.display_name, profile_code: u.profile_code }));
      return { rows };
    }

    if (sql.startsWith('SELECT t.id AS team_id, tm.role')) {
      const [slug, userId] = params as [string, string];
      const team = this.teams.find((t) => t.slug === slug);
      if (!team) return { rows: [] };
      const member = this.teamMembers.find((m) => m.team_id === team.id && m.user_id === userId);
      if (!member) return { rows: [] };
      return { rows: [{ team_id: team.id, role: member.role }] };
    }

    if (sql.startsWith('SELECT id, iso_week, starts_on, ends_on FROM report_periods')) {
      if (sql.includes('iso_week = $1')) {
        const [isoWeek] = params as [string];
        const row = this.periods.find((p) => p.iso_week === isoWeek);
        return { rows: row ? [row] : [] };
      }
      if (sql.includes('WHERE id = $1')) {
        const [periodId] = params as [number];
        const row = this.periods.find((p) => p.id === periodId);
        return { rows: row ? [row] : [] };
      }
      // starts_on <= now(), most recent
      const sorted = [...this.periods].sort((a, b) => (a.starts_on < b.starts_on ? 1 : -1));
      const row = sorted.find((p) => new Date(p.starts_on).getTime() <= Date.now());
      return { rows: row ? [row] : [] };
    }

    if (sql.startsWith('SELECT status FROM team_period_status')) {
      const [teamId, periodId] = params as [string, number];
      const row = this.teamPeriodStatus.find((s) => s.team_id === teamId && s.period_id === periodId);
      return { rows: row ? [{ status: row.status }] : [] };
    }

    if (sql.startsWith('INSERT INTO team_period_status')) {
      const [teamId, periodId, status] = params as [string, number, string];
      const existing = this.teamPeriodStatus.find((s) => s.team_id === teamId && s.period_id === periodId);
      if (existing) existing.status = status;
      else this.teamPeriodStatus.push({ team_id: teamId, period_id: periodId, status });
      return { rows: [] };
    }

    if (sql.startsWith('SELECT r.id, r.user_id, r.workload, r.delivered_cnt, r.inflight_cnt, r.submitted_at')) {
      const [teamId, periodId] = params as [string, number];
      const rows = this.reports.filter((r) => r.team_id === teamId && r.period_id === periodId);
      return { rows };
    }

    if (sql.startsWith('SELECT report_id, status FROM project_cards')) {
      const [reportIds] = params as [string[]];
      const ids = new Set(reportIds);
      return { rows: this.projectCards.filter((c) => ids.has(c.report_id)).map((c) => ({ report_id: c.report_id, status: c.status })) };
    }

    if (sql.startsWith('SELECT report_id, content, severity FROM report_items')) {
      const [reportIds] = params as [string[]];
      const ids = new Set(reportIds);
      return {
        rows: this.reportItems
          .filter((i) => ids.has(i.report_id) && i.kind === 'alert')
          .map((i) => ({ report_id: i.report_id, content: i.content, severity: i.severity })),
      };
    }

    if (sql.startsWith('SELECT id, report_id, type, content FROM opportunities')) {
      const [reportIds] = params as [string[]];
      const ids = new Set(reportIds);
      return {
        rows: this.opportunities
          .filter((o) => ids.has(o.report_id))
          .map((o) => ({ id: o.id, report_id: o.report_id, type: o.type, content: o.content })),
      };
    }

    if (sql.startsWith('SELECT r.id, r.period_id, r.workload') && sql.includes('WHERE r.id = $1')) {
      const [reportId] = params as [string];
      const row = this.reports.find((r) => r.id === reportId);
      return { rows: row ? [row] : [] };
    }

    if (sql.startsWith('SELECT r.id, r.period_id, r.workload')) {
      const [userId, teamId, periodId] = params as [string, string, number];
      const candidates = this.reports.filter((r) => r.user_id === userId && r.team_id === teamId);
      let row: ReportRow | undefined;
      if (sql.includes('period_id = $3')) {
        row = candidates.find((r) => r.period_id === periodId);
      } else {
        row = candidates
          .filter((r) => r.period_id < periodId)
          .sort((a, b) => b.period_id - a.period_id)[0];
      }
      return { rows: row ? [row] : [] };
    }

    if (sql.startsWith('SELECT id, title, description, status, sort_order FROM project_cards')) {
      const [reportId] = params as [string];
      const rows = this.projectCards.filter((c) => c.report_id === reportId).sort((a, b) => a.sort_order - b.sort_order);
      return { rows };
    }

    if (sql.startsWith('SELECT id, kind, content, severity FROM report_items')) {
      const [reportId] = params as [string];
      return { rows: this.reportItems.filter((i) => i.report_id === reportId) };
    }

    if (sql.startsWith('SELECT id, type, content FROM opportunities')) {
      const [reportId] = params as [string];
      return { rows: this.opportunities.filter((o) => o.report_id === reportId) };
    }

    if (sql.startsWith('INSERT INTO reports (')) {
      const [userId, teamId, periodId, workload, deliveredCnt, inflightCnt] = params as [
        string,
        string,
        number,
        number,
        number,
        number,
      ];
      let row = this.reports.find((r) => r.user_id === userId && r.team_id === teamId && r.period_id === periodId);
      if (!row) {
        row = {
          id: randomUUID(),
          user_id: userId,
          team_id: teamId,
          period_id: periodId,
          workload,
          delivered_cnt: deliveredCnt,
          inflight_cnt: inflightCnt,
          submitted_at: null,
          updated_at: new Date(),
        };
        this.reports.push(row);
      } else {
        row.workload = workload;
        row.delivered_cnt = deliveredCnt;
        row.inflight_cnt = inflightCnt;
        row.updated_at = new Date();
      }
      return { rows: [{ id: row.id }] };
    }

    if (sql.startsWith('DELETE FROM project_cards WHERE report_id')) {
      const [reportId] = params as [string];
      this.removeAll(this.projectCards, (c) => c.report_id === reportId);
      return { rows: [] };
    }

    if (sql.startsWith('INSERT INTO project_cards')) {
      const [reportId, title, description, status, sortOrder] = params as [
        string,
        string,
        string | null,
        string,
        number,
      ];
      this.projectCards.push({ id: randomUUID(), report_id: reportId, title, description, status, sort_order: sortOrder });
      return { rows: [] };
    }

    if (sql.startsWith('DELETE FROM report_items WHERE report_id')) {
      const [reportId] = params as [string];
      this.removeAll(this.reportItems, (i) => i.report_id === reportId);
      return { rows: [] };
    }

    if (sql.startsWith("INSERT INTO report_items (report_id, kind, content, severity) VALUES ($1, 'task_done'")) {
      const [reportId, content] = params as [string, string];
      this.reportItems.push({ id: randomUUID(), report_id: reportId, kind: 'task_done', content, severity: null });
      return { rows: [] };
    }

    if (sql.startsWith("INSERT INTO report_items (report_id, kind, content, severity) VALUES ($1, 'task_upcoming'")) {
      const [reportId, content] = params as [string, string];
      this.reportItems.push({ id: randomUUID(), report_id: reportId, kind: 'task_upcoming', content, severity: null });
      return { rows: [] };
    }

    if (sql.startsWith("INSERT INTO report_items (report_id, kind, content, severity) VALUES ($1, 'alert'")) {
      const [reportId, content, severity] = params as [string, string, string];
      this.reportItems.push({ id: randomUUID(), report_id: reportId, kind: 'alert', content, severity });
      return { rows: [] };
    }

    if (sql.startsWith('DELETE FROM opportunities WHERE report_id')) {
      const [reportId] = params as [string];
      this.removeAll(this.opportunities, (o) => o.report_id === reportId);
      return { rows: [] };
    }

    if (sql.startsWith('INSERT INTO opportunities')) {
      const [reportId, type, content] = params as [string, string, string];
      this.opportunities.push({ id: randomUUID(), report_id: reportId, type, content });
      return { rows: [] };
    }

    if (sql.startsWith('SELECT is_global_admin FROM users WHERE id = $1')) {
      const [userId] = params as [string];
      const row = this.users.find((u) => u.id === userId);
      return { rows: row ? [{ is_global_admin: row.is_global_admin }] : [] };
    }

    if (sql.startsWith('SELECT t.id, t.name, t.slug, t.client_name, t.status, t.reporting_frequency')) {
      const rows = [...this.teams]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          client_name: t.client_name,
          status: t.status,
          reporting_frequency: t.reporting_frequency,
          member_count: this.teamMembers.filter((m) => m.team_id === t.id).length,
        }));
      return { rows };
    }

    if (sql.startsWith('SELECT id, name, slug, client_name, timezone, starts_on, ends_on, reporting_frequency')) {
      const [slug] = params as [string];
      const row = this.teams.find((t) => t.slug === slug);
      return { rows: row ? [row] : [] };
    }

    if (sql.startsWith('SELECT u.id, u.email, u.display_name, tm.role')) {
      const [teamId] = params as [string];
      const members = this.teamMembers.filter((m) => m.team_id === teamId);
      const rows = members
        .map((m) => {
          const user = this.users.find((u) => u.id === m.user_id);
          if (!user) return null;
          return { id: user.id, email: user.email, display_name: user.display_name, role: m.role };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => (a.display_name ?? a.email).localeCompare(b.display_name ?? b.email));
      return { rows };
    }

    if (sql.startsWith('SELECT r.id, r.period_id, r.submitted_at, r.updated_at, u.display_name, u.email, p.iso_week')) {
      const [teamId] = params as [string];
      const rows = this.reports
        .filter((r) => r.team_id === teamId)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5)
        .map((r) => {
          const user = this.users.find((u) => u.id === r.user_id);
          const period = this.periods.find((p) => p.id === r.period_id);
          return {
            id: r.id,
            period_id: r.period_id,
            submitted_at: r.submitted_at,
            updated_at: r.updated_at,
            display_name: user?.display_name ?? null,
            email: user?.email ?? '',
            iso_week: period?.iso_week ?? '',
          };
        });
      return { rows };
    }

    if (sql.startsWith('SELECT COUNT(*) AS total FROM team_members WHERE team_id = $1')) {
      const [teamId] = params as [string];
      return { rows: [{ total: this.teamMembers.filter((m) => m.team_id === teamId).length }] };
    }

    if (sql.startsWith('SELECT COUNT(*) AS submitted FROM reports WHERE team_id = $1 AND period_id = $2')) {
      const [teamId, periodId] = params as [string, number];
      const submitted = this.reports.filter(
        (r) => r.team_id === teamId && r.period_id === periodId && r.submitted_at !== null,
      ).length;
      return { rows: [{ submitted }] };
    }

    if (sql.startsWith('SELECT 1 FROM teams WHERE slug = $1')) {
      const [slug] = params as [string];
      const exists = this.teams.some((t) => t.slug === slug);
      return { rows: exists ? [{ '?column?': 1 }] : [] };
    }

    if (sql.startsWith('INSERT INTO teams (name, slug, client_name')) {
      const [name, slug, clientName, timezone, startsOn, endsOn, reportingFrequency, freezeDow, freezeTime, freezeMode] =
        params as [string, string, string | null, string, string | null, string | null, string, number, string, string];
      const row: TeamRow = {
        id: randomUUID(),
        name,
        slug,
        client_name: clientName,
        timezone,
        starts_on: startsOn,
        ends_on: endsOn,
        reporting_frequency: reportingFrequency,
        freeze_dow: freezeDow,
        freeze_time: freezeTime,
        freeze_mode: freezeMode,
        status: 'active',
        archived_at: null,
        created_at: new Date(),
      };
      this.teams.push(row);
      return { rows: [row] };
    }

    if (sql.startsWith('INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, \'member\')')) {
      const [teamId, userId] = params as [string, string];
      const existing = this.teamMembers.find((m) => m.team_id === teamId && m.user_id === userId);
      if (!existing) this.teamMembers.push({ team_id: teamId, user_id: userId, role: 'member', leaderboard_opt_in: false });
      return { rows: [] };
    }

    if (sql.startsWith('DELETE FROM team_members WHERE team_id = $1 AND user_id = $2')) {
      const [teamId, userId] = params as [string, string];
      this.removeAll(this.teamMembers, (m) => m.team_id === teamId && m.user_id === userId);
      return { rows: [] };
    }

    if (sql.startsWith('UPDATE teams SET\n       name = $2')) {
      const [slug, name, clientName, timezone, startsOn, endsOn, reportingFrequency, freezeDow, freezeTime, freezeMode] =
        params as [string, string, string | null, string, string | null, string | null, string, number, string, string];
      const row = this.teams.find((t) => t.slug === slug);
      if (!row) return { rows: [] };
      row.name = name;
      row.client_name = clientName;
      row.timezone = timezone;
      row.starts_on = startsOn;
      row.ends_on = endsOn;
      row.reporting_frequency = reportingFrequency;
      row.freeze_dow = freezeDow;
      row.freeze_time = freezeTime;
      row.freeze_mode = freezeMode;
      return { rows: [row] };
    }

    if (sql.startsWith('UPDATE teams SET status = $2')) {
      const [slug, status] = params as [string, string];
      const row = this.teams.find((t) => t.slug === slug);
      if (!row) return { rows: [] };
      row.status = status;
      row.archived_at = status === 'archived' ? new Date() : null;
      return { rows: [row] };
    }

    if (sql.startsWith('SELECT id, slug, timezone, freeze_dow, freeze_time, freeze_mode FROM teams WHERE id = $1')) {
      const [teamId] = params as [string];
      const row = this.teams.find((t) => t.id === teamId);
      return { rows: row ? [row] : [] };
    }

    if (sql.startsWith('SELECT id, slug, timezone, freeze_dow, freeze_time, freeze_mode FROM teams')) {
      const rows = this.teams.filter((t) => t.freeze_mode === 'auto' || t.freeze_mode === 'both');
      return { rows };
    }

    if (sql.startsWith('UPDATE team_members SET leaderboard_opt_in')) {
      const [teamId, userId, optIn] = params as [string, string, boolean];
      const row = this.teamMembers.find((m) => m.team_id === teamId && m.user_id === userId);
      if (row) row.leaderboard_opt_in = optIn;
      return { rows: [] };
    }

    if (sql.startsWith('SELECT leaderboard_opt_in FROM team_members')) {
      const [teamId, userId] = params as [string, string];
      const row = this.teamMembers.find((m) => m.team_id === teamId && m.user_id === userId);
      return { rows: row ? [{ leaderboard_opt_in: row.leaderboard_opt_in }] : [] };
    }

    if (sql.startsWith('SELECT u.id, u.display_name\n     FROM team_members')) {
      const [teamId] = params as [string];
      const optedInIds = new Set(
        this.teamMembers.filter((m) => m.team_id === teamId && m.leaderboard_opt_in).map((m) => m.user_id),
      );
      const rows = this.users.filter((u) => optedInIds.has(u.id)).map((u) => ({ id: u.id, display_name: u.display_name }));
      return { rows };
    }

    if (sql.startsWith('SELECT p.id, p.ends_on, r.submitted_at')) {
      const [userId, teamId, uptoPeriodId, limit] = params as [string, string, number, number];
      const rows = this.periods
        .filter((p) => p.id <= uptoPeriodId)
        .sort((a, b) => b.id - a.id)
        .slice(0, limit)
        .map((p) => {
          const report = this.reports.find((r) => r.period_id === p.id && r.user_id === userId && r.team_id === teamId);
          return { id: p.id, ends_on: p.ends_on, submitted_at: report?.submitted_at ?? null };
        });
      return { rows };
    }

    if (sql.startsWith('SELECT p.id, p.iso_week, p.starts_on, p.ends_on')) {
      const [teamId, before] = params as [string, Date];
      const frozenPeriodIds = new Set(
        this.teamPeriodStatus.filter((s) => s.team_id === teamId && s.status === 'frozen').map((s) => s.period_id),
      );
      const rows = this.periods
        .filter((p) => new Date(p.ends_on).getTime() <= before.getTime() && !frozenPeriodIds.has(p.id))
        .sort((a, b) => (a.ends_on < b.ends_on ? -1 : 1));
      return { rows };
    }

    if (sql.startsWith('SELECT team_id, period_id, payload, frozen_at FROM period_snapshots')) {
      const [teamId, periodId] = params as [string, number];
      const row = this.periodSnapshots.find((s) => s.team_id === teamId && s.period_id === periodId);
      return { rows: row ? [row] : [] };
    }

    if (sql.startsWith('INSERT INTO period_snapshots')) {
      const [teamId, periodId, payload] = params as [string, number, string];
      const existing = this.periodSnapshots.find((s) => s.team_id === teamId && s.period_id === periodId);
      if (existing) return { rows: [] };
      const row = { team_id: teamId, period_id: periodId, payload, frozen_at: new Date() };
      this.periodSnapshots.push(row);
      return { rows: [row] };
    }

    if (sql.startsWith('UPDATE reports SET submitted_at')) {
      const [userId, teamId, periodId] = params as [string, string, number];
      const row = this.reports.find((r) => r.user_id === userId && r.team_id === teamId && r.period_id === periodId);
      if (!row) return { rows: [] };
      row.submitted_at = new Date();
      row.updated_at = new Date();
      return { rows: [{ id: row.id }] };
    }

    throw new Error(`FakeDb: unhandled query: ${sql}`);
  }

  private removeAll<T>(arr: T[], predicate: (item: T) => boolean): void {
    for (let i = arr.length - 1; i >= 0; i -= 1) {
      if (predicate(arr[i])) arr.splice(i, 1);
    }
  }
}
