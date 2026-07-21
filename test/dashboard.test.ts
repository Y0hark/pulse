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

describe('GET /teams/:team/dashboard', () => {
  it('404s when the caller is not a member of the team', async () => {
    const { app } = await setup();
    await request(app).get('/teams/some-other-team/dashboard').expect(403);
  });

  it('reports every roster member as pending and zeroed stats when nobody has submitted', async () => {
    const { app, period } = await setup();
    const res = await request(app).get(`/teams/ceva-logistics/dashboard?period=${period.iso_week}`).expect(200);

    expect(res.body.period.isoWeek).toBe('2026-W29');
    expect(res.body.aggregate.workload).toEqual({
      mean: 0,
      max: 0,
      min: 0,
      distribution: [
        { bucket: 'low', count: 0 },
        { bucket: 'steady', count: 0 },
        { bucket: 'high', count: 0 },
        { bucket: 'critical', count: 0 },
      ],
    });
    expect(res.body.aggregate.submissionStatus.pending).toHaveLength(2);
    expect(res.body.aggregate.submissionStatus.submitted).toHaveLength(0);
  });

  it('updates once a member submits, and reflects it under their profile', async () => {
    const { app, period } = await setup();

    await request(app)
      .put(`/teams/ceva-logistics/reports/mine?period=${period.iso_week}`)
      .send({
        workload: 70,
        deliveredCnt: 2,
        inflightCnt: 1,
        projectCards: [{ title: 'Rollout', description: null, status: 'at_risk', sortOrder: 0 }],
        majorTasksDid: [],
        majorTasksToDo: [],
        alerts: [{ content: 'Vendor delay', severity: 'critical' }],
        opportunities: [],
      })
      .expect(200);
    await request(app).post(`/teams/ceva-logistics/reports/mine/submit?period=${period.iso_week}`).expect(200);

    const res = await request(app).get(`/teams/ceva-logistics/dashboard?period=${period.iso_week}`).expect(200);

    expect(res.body.aggregate.workload.mean).toBe(70);
    expect(res.body.aggregate.totalDelivered).toBe(2);
    expect(res.body.aggregate.projectHealth).toEqual({ good: 0, at_risk: 1, blocked: 0 });
    expect(res.body.aggregate.alerts).toEqual([{ content: 'Vendor delay', severity: 'critical' }]);
    expect(res.body.aggregate.submissionStatus.submitted).toEqual([{ userId: 'fake-user-1', displayName: 'Manager Person' }]);

    const manager = res.body.aggregate.byProfile.find((p: { code: string }) => p.code === 'manager');
    expect(manager.headcount).toBe(1);
    expect(manager.meanWorkload).toBe(70);
  });

  it('serves cached data until the next report write invalidates it', async () => {
    const { app, period } = await setup();

    const before = await request(app).get(`/teams/ceva-logistics/dashboard?period=${period.iso_week}`).expect(200);
    expect(before.body.aggregate.workload.mean).toBe(0);

    await request(app)
      .put(`/teams/ceva-logistics/reports/mine?period=${period.iso_week}`)
      .send({ workload: 30, deliveredCnt: 0, inflightCnt: 0, projectCards: [], majorTasksDid: [], majorTasksToDo: [], alerts: [], opportunities: [] })
      .expect(200);
    await request(app).post(`/teams/ceva-logistics/reports/mine/submit?period=${period.iso_week}`).expect(200);

    const after = await request(app).get(`/teams/ceva-logistics/dashboard?period=${period.iso_week}`).expect(200);
    expect(after.body.aggregate.workload.mean).toBe(30);
  });
});
