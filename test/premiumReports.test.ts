import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { FakeDb } from './fakeDb.js';
import { FakeAuthProvider } from './fakeAuthProvider.js';

async function setup() {
  const db = new FakeDb();
  db.seedUser('fake-user-1', 'manager@example.com', 'Manager Person', 'manager');
  db.seedUser('member-2', 'member2@example.com', 'Member Two', 'ba');
  const team = db.seedTeam('ceva-logistics');
  db.addMember(team.id, 'fake-user-1', 'manager');
  db.addMember(team.id, 'member-2');
  const period = db.seedPeriod('2026-W29', '2026-07-13', '2026-07-20');

  const authProvider = new FakeAuthProvider();
  const app = createApp({ authProvider, db });
  await request(app).get('/auth/callback?token=valid-token').expect(302);

  return { db, team, period, app };
}

describe('GET /teams/:team/reports/completion', () => {
  it('reports every roster member as missing when nobody has submitted', async () => {
    const { app, period } = await setup();

    const res = await request(app).get(`/teams/ceva-logistics/reports/completion?period=${period.iso_week}`).expect(200);

    expect(res.body.completion.rows).toHaveLength(2);
    expect(res.body.completion.rows.every((r: any) => r.status === 'missing')).toBe(true);
    expect(res.body.completion.summary).toEqual({ onTime: 0, late: 0, missing: 2, completionPct: 0 });
  });

  it('flags a submission after the freeze deadline as late', async () => {
    const { app, period, db, team } = await setup();

    await request(app)
      .put(`/teams/ceva-logistics/reports/mine?period=${period.iso_week}`)
      .send({
        workload: 40,
        deliveredCnt: 1,
        inflightCnt: 0,
        projectCards: [],
        majorTasksDid: [],
        majorTasksToDo: [],
        alerts: [],
        opportunities: [],
      })
      .expect(200);
    await request(app).post(`/teams/ceva-logistics/reports/mine/submit?period=${period.iso_week}`).expect(200);

    // Deadline is the day after ends_on (2026-07-20) at 09:30 Europe/Paris on freeze_dow (Tue by
    // default) — force the just-submitted report's timestamp far enough past that to be late.
    const report = db.reports.find((r) => r.team_id === team.id);
    report!.submitted_at = new Date('2026-08-01T00:00:00Z');

    const res = await request(app).get(`/teams/ceva-logistics/reports/completion?period=${period.iso_week}`).expect(200);

    const managerRow = res.body.completion.rows.find((r: any) => r.userId === 'fake-user-1');
    expect(managerRow.status).toBe('late');
    expect(res.body.completion.summary.late).toBe(1);
    expect(res.body.completion.summary.missing).toBe(1);
  });
});

describe('GET /teams/:team/periods/history', () => {
  it('lists frozen periods most recent first', async () => {
    const { app, team, db } = await setup();
    const p1 = db.seedPeriod('2026-W27', '2026-06-29', '2026-07-06');
    const p2 = db.seedPeriod('2026-W28', '2026-07-06', '2026-07-13');
    db.freezePeriod(team.id, p1.id);
    db.freezePeriod(team.id, p2.id);

    const res = await request(app).get('/teams/ceva-logistics/periods/history').expect(200);

    expect(res.body.history).toHaveLength(2);
    expect(res.body.history[0].period.isoWeek).toBe('2026-W28');
    expect(res.body.history[1].period.isoWeek).toBe('2026-W27');
  });

  it('excludes periods that have not been frozen', async () => {
    const { app } = await setup();
    const res = await request(app).get('/teams/ceva-logistics/periods/history').expect(200);
    expect(res.body.history).toEqual([]);
  });
});

describe('GET /missions/consolidated-report', () => {
  it('rolls up totals across all active missions for the period', async () => {
    const { app, db, period } = await setup();
    const other = db.seedTeam('acme', { name: 'Acme' });
    db.seedUser('other-user', 'other@example.com', 'Other User');
    db.addMember(other.id, 'other-user');

    const archived = db.seedTeam('legacy', { name: 'Legacy', status: 'archived' });
    db.seedUser('archived-user', 'archived@example.com');
    db.addMember(archived.id, 'archived-user');

    await request(app)
      .put(`/teams/ceva-logistics/reports/mine?period=${period.iso_week}`)
      .send({ workload: 60, deliveredCnt: 3, inflightCnt: 1, projectCards: [], majorTasksDid: [], majorTasksToDo: [], alerts: [], opportunities: [] })
      .expect(200);
    await request(app).post(`/teams/ceva-logistics/reports/mine/submit?period=${period.iso_week}`).expect(200);

    const res = await request(app).get(`/missions/consolidated-report?period=${period.iso_week}`).expect(200);

    expect(res.body.report.totals.missionCount).toBe(2); // archived excluded
    const ceva = res.body.report.missions.find((m: any) => m.missionSlug === 'ceva-logistics');
    expect(ceva.submitted).toBe(1);
    expect(ceva.totalDelivered).toBe(3);
    const acme = res.body.report.missions.find((m: any) => m.missionSlug === 'acme');
    expect(acme.submitted).toBe(0);
    expect(res.body.report.totals.totalDelivered).toBe(3);
  });

  it('401s when unauthenticated', async () => {
    const db = new FakeDb();
    const app = createApp({ authProvider: new FakeAuthProvider(), db });
    await request(app).get('/missions/consolidated-report').expect(401);
  });
});
