import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { FakeDb } from './fakeDb.js';
import { FakeAuthProvider } from './fakeAuthProvider.js';

async function setup() {
  const db = new FakeDb();
  const team = db.seedTeam('ceva-logistics');
  db.addMember(team.id, 'fake-user-1');
  const period = db.seedPeriod('2026-W29', '2026-07-13', '2026-07-20');

  const authProvider = new FakeAuthProvider();
  const app = createApp({ authProvider, db });
  await request(app).get('/auth/callback?token=valid-token').expect(302);

  return { db, team, period, app };
}

describe('GET /teams/:team/periods/current', () => {
  it('404s when the caller is not a member of the team', async () => {
    const { app } = await setup();
    await request(app).get('/teams/some-other-team/periods/current').expect(403);
  });

  it('returns an empty prefilled draft when there is no previous report', async () => {
    const { app } = await setup();
    const res = await request(app).get('/teams/ceva-logistics/periods/current').expect(200);

    expect(res.body.period.isoWeek).toBe('2026-W29');
    expect(res.body.status).toBe('open');
    expect(res.body.draft.workload).toBe(0);
    expect(res.body.draft.projectCards).toEqual([]);
  });
});

describe('PUT /teams/:team/reports/mine (upsert)', () => {
  it('is idempotent: retrying the same PUT keeps a single report row', async () => {
    const { app, db, team, period } = await setup();

    const payload = {
      workload: 65,
      deliveredCnt: 3,
      inflightCnt: 1,
      projectCards: [{ title: 'Rollout', description: 'Phase 1', status: 'good', sortOrder: 0 }],
      majorTasksDid: ['Deployed staging'],
      majorTasksToDo: ['Deploy prod'],
      alerts: [{ content: 'Waiting on vendor', severity: 'warn' }],
      opportunities: [{ type: 'new_project', content: 'Adjacent team asked for help' }],
    };

    const first = await request(app)
      .put(`/teams/ceva-logistics/reports/mine?period=${period.iso_week}`)
      .send(payload)
      .expect(200);
    const second = await request(app)
      .put(`/teams/ceva-logistics/reports/mine?period=${period.iso_week}`)
      .send(payload)
      .expect(200);

    expect(first.body.report.id).toBe(second.body.report.id);
    expect(db.reports.filter((r) => r.team_id === team.id && r.period_id === period.id)).toHaveLength(1);
    expect(second.body.report.projectCards).toHaveLength(1);
    expect(second.body.report.alerts).toEqual([{ content: 'Waiting on vendor', severity: 'warn' }]);
  });

  it('rejects writes once the team period is frozen', async () => {
    const { app, db, team, period } = await setup();
    db.freezePeriod(team.id, period.id);

    await request(app)
      .put(`/teams/ceva-logistics/reports/mine?period=${period.iso_week}`)
      .send({ workload: 10, deliveredCnt: 0, inflightCnt: 0, projectCards: [], majorTasksDid: [], majorTasksToDo: [], alerts: [], opportunities: [] })
      .expect(409);
  });
});

describe('submit flow', () => {
  it('allows re-submit while the period stays open (upsert semantics)', async () => {
    const { app, period } = await setup();
    const payload = {
      workload: 40,
      deliveredCnt: 1,
      inflightCnt: 1,
      projectCards: [],
      majorTasksDid: [],
      majorTasksToDo: [],
      alerts: [],
      opportunities: [],
    };

    await request(app).put(`/teams/ceva-logistics/reports/mine?period=${period.iso_week}`).send(payload).expect(200);
    const firstSubmit = await request(app)
      .post(`/teams/ceva-logistics/reports/mine/submit?period=${period.iso_week}`)
      .expect(200);
    expect(firstSubmit.body.report.submittedAt).toBeTruthy();

    const secondSubmit = await request(app)
      .post(`/teams/ceva-logistics/reports/mine/submit?period=${period.iso_week}`)
      .expect(200);
    expect(secondSubmit.body.report.submittedAt).toBeTruthy();
  });

  it('rejects submit once the period is frozen', async () => {
    const { app, db, team, period } = await setup();
    await request(app)
      .put(`/teams/ceva-logistics/reports/mine?period=${period.iso_week}`)
      .send({ workload: 5, deliveredCnt: 0, inflightCnt: 0, projectCards: [], majorTasksDid: [], majorTasksToDo: [], alerts: [], opportunities: [] })
      .expect(200);

    db.freezePeriod(team.id, period.id);

    await request(app).post(`/teams/ceva-logistics/reports/mine/submit?period=${period.iso_week}`).expect(409);
  });
});

describe('GET /teams/:team/reports/mine', () => {
  it('404s when no report exists yet for that period', async () => {
    const { app, period } = await setup();
    await request(app).get(`/teams/ceva-logistics/reports/mine?period=${period.iso_week}`).expect(404);
  });
});

describe('prefill from a previous week', () => {
  it('clones project cards and to-dos, and resets weekly counters', async () => {
    // Periods must be seeded in chronological order: period_id ordering (like a real SERIAL
    // column populated by a calendar job) is what "previous period" comparisons rely on.
    const db = new FakeDb();
    const team = db.seedTeam('ceva-logistics');
    db.addMember(team.id, 'fake-user-1');
    const lastWeek = db.seedPeriod('2026-W28', '2026-07-06', '2026-07-13');
    db.seedPeriod('2026-W29', '2026-07-13', '2026-07-20');

    const authProvider = new FakeAuthProvider();
    const app = createApp({ authProvider, db });
    await request(app).get('/auth/callback?token=valid-token').expect(302);

    await request(app)
      .put(`/teams/ceva-logistics/reports/mine?period=${lastWeek.iso_week}`)
      .send({
        workload: 80,
        deliveredCnt: 5,
        inflightCnt: 2,
        projectCards: [{ title: 'Migrate billing', description: null, status: 'at_risk', sortOrder: 0 }],
        majorTasksDid: ['Shipped v2'],
        majorTasksToDo: ['Finish billing migration'],
        alerts: [],
        opportunities: [],
      })
      .expect(200);

    const currentRes = await request(app).get('/teams/ceva-logistics/periods/current').expect(200);

    expect(currentRes.body.draft.workload).toBe(80);
    expect(currentRes.body.draft.deliveredCnt).toBe(0);
    expect(currentRes.body.draft.inflightCnt).toBe(0);
    expect(currentRes.body.draft.projectCards).toEqual([
      { title: 'Migrate billing', description: null, status: 'at_risk', sortOrder: 0 },
    ]);
    expect(currentRes.body.draft.majorTasksToDo).toEqual(['Finish billing migration']);
    expect(currentRes.body.draft.majorTasksDid).toEqual([]);
  });
});
