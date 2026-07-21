import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { FakeDb } from './fakeDb.js';
import { FakeAuthProvider } from './fakeAuthProvider.js';

async function setup(isGlobalAdmin = false) {
  const db = new FakeDb();
  db.seedUser('fake-user-1', 'admin@example.com', 'Admin', null, isGlobalAdmin);

  const authProvider = new FakeAuthProvider();
  const app = createApp({ authProvider, db });
  await request(app).get('/auth/callback?token=valid-token').expect(302);

  return { db, app };
}

describe('GET /missions', () => {
  it('lists every mission regardless of membership', async () => {
    const { db, app } = await setup();
    db.seedTeam('ceva-logistics', { name: 'CEVA Logistics', clientName: 'CEVA' });
    db.seedTeam('acme', { name: 'Acme', status: 'archived' });

    const res = await request(app).get('/missions').expect(200);

    expect(res.body.missions).toHaveLength(2);
    const ceva = res.body.missions.find((m: any) => m.slug === 'ceva-logistics');
    expect(ceva.clientName).toBe('CEVA');
    expect(ceva.memberCount).toBe(0);
  });

  it('401s when unauthenticated', async () => {
    const db = new FakeDb();
    const app = createApp({ authProvider: new FakeAuthProvider(), db });
    await request(app).get('/missions').expect(401);
  });
});

describe('GET /missions/:slug', () => {
  it('404s for an unknown slug', async () => {
    const { app } = await setup();
    await request(app).get('/missions/does-not-exist').expect(404);
  });

  it('returns team members, recent reports and current-period completion', async () => {
    const { db, app } = await setup();
    const team = db.seedTeam('ceva-logistics', { name: 'CEVA Logistics' });
    db.addMember(team.id, 'fake-user-1');
    const otherUser = db.seedUser('user-2', 'member@example.com', 'Team Member');
    db.addMember(team.id, otherUser.id);
    const period = db.seedPeriod('2026-W29', '2026-07-13', '2026-07-20');
    await request(app)
      .put(`/teams/ceva-logistics/reports/mine?period=${period.iso_week}`)
      .send({
        workload: 50,
        deliveredCnt: 1,
        inflightCnt: 1,
        projectCards: [],
        majorTasksDid: [],
        majorTasksToDo: [],
        alerts: [],
        opportunities: [],
      })
      .expect(200);
    await request(app).post(`/teams/ceva-logistics/reports/mine/submit?period=${period.iso_week}`).expect(200);

    const res = await request(app).get('/missions/ceva-logistics').expect(200);

    expect(res.body.mission.memberCount).toBe(2);
    expect(res.body.mission.members).toHaveLength(2);
    expect(res.body.mission.recentReports).toHaveLength(1);
    expect(res.body.mission.completion).toEqual({ submitted: 1, total: 2 });
  });
});

describe('POST /missions (create)', () => {
  it('403s for a non-admin', async () => {
    const { app } = await setup(false);
    await request(app).post('/missions').send({ name: 'New Mission' }).expect(403);
  });

  it('creates a mission with a derived slug for a global admin', async () => {
    const { app } = await setup(true);
    const res = await request(app).post('/missions').send({ name: 'Globex Corp' }).expect(201);

    expect(res.body.mission.slug).toBe('globex-corp');
    expect(res.body.mission.status).toBe('active');
    expect(res.body.mission.reportingFrequency).toBe('weekly');
  });

  it('rejects a missing name', async () => {
    const { app } = await setup(true);
    await request(app).post('/missions').send({}).expect(400);
  });

  it('auto-provisions and attaches members supplied at creation', async () => {
    const { app } = await setup(true);
    const res = await request(app)
      .post('/missions')
      .send({ name: 'Initech', memberEmails: ['new.member@example.com'] })
      .expect(201);

    const detail = await request(app).get(`/missions/${res.body.mission.slug}`).expect(200);
    expect(detail.body.mission.memberCount).toBe(1);
    expect(detail.body.mission.members[0].email).toBe('new.member@example.com');
  });
});

describe('PUT /missions/:slug (edit settings)', () => {
  it('403s for a non-admin', async () => {
    const { db, app } = await setup(false);
    db.seedTeam('ceva-logistics');
    await request(app)
      .put('/missions/ceva-logistics')
      .send({
        name: 'CEVA',
        timezone: 'Europe/Paris',
        reportingFrequency: 'weekly',
        freezeDow: 2,
        freezeTime: '09:30',
        freezeMode: 'both',
      })
      .expect(403);
  });

  it('updates settings for a global admin', async () => {
    const { db, app } = await setup(true);
    db.seedTeam('ceva-logistics', { name: 'CEVA Logistics' });

    const res = await request(app)
      .put('/missions/ceva-logistics')
      .send({
        name: 'CEVA Logistics EMEA',
        clientName: 'CEVA',
        timezone: 'Europe/Paris',
        reportingFrequency: 'biweekly',
        freezeDow: 3,
        freezeTime: '10:00',
        freezeMode: 'manual',
      })
      .expect(200);

    expect(res.body.mission.name).toBe('CEVA Logistics EMEA');
    expect(res.body.mission.reportingFrequency).toBe('biweekly');
    expect(res.body.mission.freezeDow).toBe(3);
  });

  it('404s for an unknown slug', async () => {
    const { app } = await setup(true);
    await request(app)
      .put('/missions/does-not-exist')
      .send({
        name: 'X',
        timezone: 'Europe/Paris',
        reportingFrequency: 'weekly',
        freezeDow: 2,
        freezeTime: '09:30',
        freezeMode: 'both',
      })
      .expect(404);
  });
});

describe('POST /missions/:slug/archive and /activate', () => {
  it('archives then reactivates a mission for a global admin', async () => {
    const { db, app } = await setup(true);
    db.seedTeam('ceva-logistics');

    const archived = await request(app).post('/missions/ceva-logistics/archive').expect(200);
    expect(archived.body.mission.status).toBe('archived');
    expect(archived.body.mission.archivedAt).not.toBeNull();

    const activated = await request(app).post('/missions/ceva-logistics/activate').expect(200);
    expect(activated.body.mission.status).toBe('active');
    expect(activated.body.mission.archivedAt).toBeNull();
  });

  it('403s for a non-admin', async () => {
    const { db, app } = await setup(false);
    db.seedTeam('ceva-logistics');
    await request(app).post('/missions/ceva-logistics/archive').expect(403);
  });
});

describe('mission members', () => {
  it('adds and removes a member as a global admin', async () => {
    const { db, app } = await setup(true);
    db.seedTeam('ceva-logistics');

    const added = await request(app)
      .post('/missions/ceva-logistics/members')
      .send({ email: 'teammate@example.com' })
      .expect(201);
    expect(added.body.member.email).toBe('teammate@example.com');

    const afterAdd = await request(app).get('/missions/ceva-logistics').expect(200);
    expect(afterAdd.body.mission.memberCount).toBe(1);

    await request(app)
      .delete(`/missions/ceva-logistics/members/${added.body.member.userId}`)
      .expect(204);

    const afterRemove = await request(app).get('/missions/ceva-logistics').expect(200);
    expect(afterRemove.body.mission.memberCount).toBe(0);
  });

  it('403s for a non-admin', async () => {
    const { db, app } = await setup(false);
    db.seedTeam('ceva-logistics');
    await request(app).post('/missions/ceva-logistics/members').send({ email: 'x@example.com' }).expect(403);
  });
});
