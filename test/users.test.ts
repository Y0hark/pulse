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

describe('GET /users', () => {
  it('401s when unauthenticated', async () => {
    const db = new FakeDb();
    const app = createApp({ authProvider: new FakeAuthProvider(), db });
    await request(app).get('/users').expect(401);
  });

  it('403s for a non-admin', async () => {
    const { app } = await setup(false);
    await request(app).get('/users').expect(403);
  });

  it('lists every user with global-admin/active flags and mission roles', async () => {
    const { db, app } = await setup(true);
    const team = db.seedTeam('ceva-logistics', { name: 'CEVA Logistics' });
    const other = db.seedUser('user-2', 'member@example.com', 'Team Member');
    db.addMember(team.id, other.id, 'manager');

    const res = await request(app).get('/users').expect(200);

    expect(res.body.users).toHaveLength(2);
    const member = res.body.users.find((u: any) => u.id === 'user-2');
    expect(member.isActive).toBe(true);
    expect(member.isGlobalAdmin).toBe(false);
    expect(member.missions).toEqual([{ id: team.id, name: 'CEVA Logistics', slug: 'ceva-logistics', role: 'manager' }]);
  });
});

describe('POST /users (create)', () => {
  it('403s for a non-admin', async () => {
    const { app } = await setup(false);
    await request(app).post('/users').send({ email: 'new@example.com' }).expect(403);
  });

  it('400s on invalid input', async () => {
    const { app } = await setup(true);
    await request(app).post('/users').send({}).expect(400);
  });

  it('creates a user', async () => {
    const { app } = await setup(true);
    const res = await request(app)
      .post('/users')
      .send({ email: 'new@example.com', displayName: 'New Person' })
      .expect(201);
    expect(res.body.user.email).toBe('new@example.com');
    expect(res.body.user.isGlobalAdmin).toBe(false);
  });

  it('409s on a duplicate email', async () => {
    const { app } = await setup(true);
    await request(app).post('/users').send({ email: 'dup@example.com' }).expect(201);
    await request(app).post('/users').send({ email: 'dup@example.com' }).expect(409);
  });
});

describe('PUT /users/:id', () => {
  it('updates display name', async () => {
    const { db, app } = await setup(true);
    await request(app).put('/users/fake-user-1').send({ displayName: 'Renamed' }).expect(200);
    expect(db.users.find((u) => u.id === 'fake-user-1')?.display_name).toBe('Renamed');
  });
});

describe('activate/deactivate', () => {
  it('deactivates a non-admin user', async () => {
    const { db, app } = await setup(true);
    const other = db.seedUser('user-2', 'member@example.com');
    await request(app).post(`/users/${other.id}/deactivate`).expect(200);
    expect(db.users.find((u) => u.id === 'user-2')?.is_active).toBe(false);
  });

  it('reactivates a user', async () => {
    const { db, app } = await setup(true);
    const other = db.seedUser('user-2', 'member@example.com', null, null, false, false);
    await request(app).post(`/users/${other.id}/activate`).expect(200);
    expect(db.users.find((u) => u.id === 'user-2')?.is_active).toBe(true);
  });
});

describe('global-admin toggle', () => {
  it('blocks deactivating the last global admin', async () => {
    const { db, app } = await setup(true);
    await request(app).post('/users/fake-user-1/deactivate').expect(400);
    expect(db.users.find((u) => u.id === 'fake-user-1')?.is_active).toBe(true);
  });

  it('blocks demoting the last global admin', async () => {
    const { app } = await setup(true);
    await request(app).put('/users/fake-user-1/global-admin').send({ isGlobalAdmin: false }).expect(400);
  });

  it('allows demoting an admin when another admin remains', async () => {
    const { db, app } = await setup(true);
    db.seedUser('user-2', 'admin2@example.com', null, null, true);
    await request(app).put('/users/fake-user-1/global-admin').send({ isGlobalAdmin: false }).expect(200);
    expect(db.users.find((u) => u.id === 'fake-user-1')?.is_global_admin).toBe(false);
  });

  it('promotes a user to global admin', async () => {
    const { db, app } = await setup(true);
    const other = db.seedUser('user-2', 'member@example.com');
    await request(app).put(`/users/${other.id}/global-admin`).send({ isGlobalAdmin: true }).expect(200);
    expect(db.users.find((u) => u.id === 'user-2')?.is_global_admin).toBe(true);
  });
});

describe('mission role assignment', () => {
  it('assigns a role on a mission', async () => {
    const { db, app } = await setup(true);
    const team = db.seedTeam('ceva-logistics');
    const other = db.seedUser('user-2', 'member@example.com');

    await request(app).put(`/users/${other.id}/missions/ceva-logistics/role`).send({ role: 'manager' }).expect(200);

    expect(db.teamMembers.find((m) => m.team_id === team.id && m.user_id === other.id)?.role).toBe('manager');
  });

  it('400s on an invalid role', async () => {
    const { db, app } = await setup(true);
    db.seedTeam('ceva-logistics');
    await request(app).put('/users/fake-user-1/missions/ceva-logistics/role').send({ role: 'owner' }).expect(400);
  });

  it('404s for an unknown mission', async () => {
    const { app } = await setup(true);
    await request(app).put('/users/fake-user-1/missions/does-not-exist/role').send({ role: 'manager' }).expect(404);
  });

  it('removes a user from a mission', async () => {
    const { db, app } = await setup(true);
    const team = db.seedTeam('ceva-logistics');
    const other = db.seedUser('user-2', 'member@example.com');
    db.addMember(team.id, other.id);

    await request(app).delete(`/users/${other.id}/missions/ceva-logistics`).expect(204);

    expect(db.teamMembers.some((m) => m.team_id === team.id && m.user_id === other.id)).toBe(false);
  });
});
