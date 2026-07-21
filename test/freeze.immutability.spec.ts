import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { FakeDb } from './fakeDb.js';
import { FakeAuthProvider } from './fakeAuthProvider.js';
import { computeFreezeInstant, freezeTeamPeriod, runScheduledFreezes } from '../src/services/freeze.js';

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

describe('POST /teams/:team/periods/:id/freeze', () => {
  it('403s for a plain member', async () => {
    const db = new FakeDb();
    db.seedUser('member-2', 'member2@example.com', 'Member Two', 'ba');
    const team = db.seedTeam('ceva-logistics');
    db.addMember(team.id, 'member-2');
    const period = db.seedPeriod('2026-W29', '2026-07-13', '2026-07-20');
    const authProvider = new FakeAuthProvider();
    const app = createApp({ authProvider, db });
    authProvider.loggedInUserId = 'member-2';

    await request(app).post(`/teams/ceva-logistics/periods/${period.id}/freeze`).expect(403);
  });

  it('manager/admin can freeze: persists a snapshot and marks the team period frozen', async () => {
    const { db, app, team, period } = await setup();

    await request(app)
      .put(`/teams/ceva-logistics/reports/mine?period=${period.iso_week}`)
      .send({
        workload: 42,
        deliveredCnt: 3,
        inflightCnt: 1,
        projectCards: [],
        majorTasksDid: [],
        majorTasksToDo: [],
        alerts: [],
        opportunities: [],
      })
      .expect(200);
    await request(app).post(`/teams/ceva-logistics/reports/mine/submit?period=${period.iso_week}`).expect(200);

    const res = await request(app).post(`/teams/ceva-logistics/periods/${period.id}/freeze`).expect(200);
    expect(res.body.snapshot.payload.workload.mean).toBe(42);
    expect(res.body.period.isoWeek).toBe('2026-W29');

    const status = db.teamPeriodStatus.find((s) => s.team_id === team.id && s.period_id === period.id);
    expect(status?.status).toBe('frozen');
  });

  it('re-freeze is a no-op that returns the original snapshot, even if data changed after freezing', async () => {
    const { db, team, period } = await setup();

    const first = await freezeTeamPeriod(db, team.id, period.id);
    expect(first.payload.workload.mean).toBe(0);

    // Mutate the underlying report data directly (bypassing the write guard) to prove
    // a second freeze call does not recompute from the now-different live data.
    db.reports.push({
      id: 'report-x',
      user_id: 'member-2',
      team_id: team.id,
      period_id: period.id,
      workload: 99,
      delivered_cnt: 0,
      inflight_cnt: 0,
      submitted_at: new Date(),
      updated_at: new Date(),
    });

    const second = await freezeTeamPeriod(db, team.id, period.id);
    expect(second).toEqual(first);
    expect(db.periodSnapshots).toHaveLength(1);
  });

  it('rejects report writes once the period is frozen', async () => {
    const { app, db, team, period } = await setup();
    await freezeTeamPeriod(db, team.id, period.id);

    await request(app)
      .put(`/teams/ceva-logistics/reports/mine?period=${period.iso_week}`)
      .send({ workload: 10, deliveredCnt: 0, inflightCnt: 0, projectCards: [], majorTasksDid: [], majorTasksToDo: [], alerts: [], opportunities: [] })
      .expect(409, { error: 'period_frozen' });

    await request(app).post(`/teams/ceva-logistics/reports/mine/submit?period=${period.iso_week}`).expect(409, {
      error: 'period_frozen',
    });
  });
});

describe('GET /teams/:team/periods/:id/snapshot', () => {
  it('404s before the period is frozen', async () => {
    const { app, period } = await setup();
    await request(app).get(`/teams/ceva-logistics/periods/${period.id}/snapshot`).expect(404, { error: 'not_frozen' });
  });

  it('returns the frozen payload once frozen', async () => {
    const { app, db, team, period } = await setup();
    await freezeTeamPeriod(db, team.id, period.id);

    const res = await request(app).get(`/teams/ceva-logistics/periods/${period.id}/snapshot`).expect(200);
    expect(res.body.snapshot.periodId).toBe(period.id);
    expect(res.body.snapshot.teamId).toBe(team.id);
    expect(res.body.period.isoWeek).toBe('2026-W29');
  });
});

describe('computeFreezeInstant', () => {
  it('lands on the configured weekday/time after the period ends, in the team timezone', () => {
    const instant = computeFreezeInstant('2026-07-20', { timezone: 'Europe/Paris', freezeDow: 2, freezeTime: '09:30' });
    expect(instant.weekday).toBe(2);
    expect(instant.toFormat('yyyy-LL-dd HH:mm')).toBe('2026-07-21 09:30');
  });
});

describe('runScheduledFreezes', () => {
  it('freezes an ended, unfrozen period once its due instant has passed', async () => {
    const db = new FakeDb();
    db.seedUser('member-2', 'member2@example.com', 'Member Two', 'ba');
    const team = db.seedTeam('ceva-logistics', { freezeMode: 'both' });
    db.addMember(team.id, 'member-2');
    const period = db.seedPeriod('2026-W29', '2026-07-13', '2026-07-20');

    await runScheduledFreezes(db, new Date('2026-07-20T12:00:00Z'));
    expect(db.periodSnapshots).toHaveLength(0);

    await runScheduledFreezes(db, new Date('2026-07-21T08:00:00Z'));
    expect(db.periodSnapshots).toHaveLength(1);
  });

  it('does not touch teams configured for manual-only freeze', async () => {
    const db = new FakeDb();
    const team = db.seedTeam('ceva-logistics', { freezeMode: 'manual' });
    db.seedPeriod('2026-W29', '2026-07-13', '2026-07-20');
    void team;

    await runScheduledFreezes(db, new Date('2026-07-25T12:00:00Z'));
    expect(db.periodSnapshots).toHaveLength(0);
  });

  it('re-checking after a period is already frozen does not recompute it', async () => {
    const db = new FakeDb();
    const team = db.seedTeam('ceva-logistics', { freezeMode: 'auto' });
    const period = db.seedPeriod('2026-W29', '2026-07-13', '2026-07-20');
    await freezeTeamPeriod(db, team.id, period.id);

    await runScheduledFreezes(db, new Date('2026-07-22T00:00:00Z'));
    expect(db.periodSnapshots).toHaveLength(1);
  });
});
