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
  is_global_admin: boolean;
}

interface TeamRow {
  id: string;
  slug: string;
}

interface TeamMemberRow {
  team_id: string;
  user_id: string;
  role: string;
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
  readonly reports: ReportRow[] = [];
  readonly projectCards: ProjectCardRow[] = [];
  readonly reportItems: ReportItemRow[] = [];
  readonly opportunities: OpportunityRow[] = [];

  // --- test-only seed helpers (not SQL-backed) ---

  seedTeam(slug: string): TeamRow {
    const row = { id: randomUUID(), slug };
    this.teams.push(row);
    return row;
  }

  seedUser(id: string, email: string, displayName: string | null = null): UserRow {
    const row = { id, email, display_name: displayName, profile_id: null, is_global_admin: false };
    this.users.push(row);
    return row;
  }

  addMember(teamId: string, userId: string, role = 'member'): void {
    this.teamMembers.push({ team_id: teamId, user_id: userId, role });
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
        row = { id: randomUUID(), email, display_name: null, profile_id: null, is_global_admin: false };
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
