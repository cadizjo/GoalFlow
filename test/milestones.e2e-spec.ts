import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDb } from './utils/cleanup';
import { signupAndLogin, authHeader, createGoal } from './utils/helpers';

describe('Milestones (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let goalId: string;

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const createMilestone = (overrides: Partial<any> = {}) =>
    request(app.getHttpServer())
      .post(`/goals/${goalId}/milestones`)
      .set(authHeader(token))
      .send({ title: 'Milestone', ...overrides })

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await cleanDb(app);
    token = await signupAndLogin(app, 'milestones');
    const goal = await createGoal(app, token).expect(201);
    goalId = goal.body.id;
  });

  afterAll(async () => {
    await cleanDb(app);
    await app.close();
  });

  // ─── POST /goals/:goalId/milestones ────────────────────────────────────────

  it('POST /goals/:goalId/milestones — requires JWT', async () => {
    await request(app.getHttpServer())
      .post(`/goals/${goalId}/milestones`)
      .send({ title: 'No auth' })
      .expect(401);
  });

  it('POST /goals/:goalId/milestones — creates a milestone with auto sequence', async () => {
    const res = await createMilestone({ title: 'Milestone 1' }).expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Milestone 1');
    expect(res.body.sequence).toBe(0);
  });

  it('POST /goals/:goalId/milestones — auto-increments sequence', async () => {
    await createMilestone({ title: 'Milestone 1' }).expect(201);

    const res = await createMilestone({ title: 'Milestone 2' }).expect(201);

    expect(res.body.sequence).toBe(1);
  });

  it('POST /goals/:goalId/milestones — accepts explicit sequence', async () => {
    const res = await createMilestone({ title: 'Milestone', sequence: 5 }).expect(201);

    expect(res.body.sequence).toBe(5);
  });

  it('POST /goals/:goalId/milestones — rejects duplicate sequence', async () => {
    await createMilestone({ title: 'Milestone 1', sequence: 0 }).expect(201);

    await createMilestone({ title: 'Milestone 2', sequence: 0 }).expect(400);
  });

  it('POST — auto-assign skips gaps from soft-deleted milestones', async () => {
    await createMilestone({ title: 'M0', sequence: 0 }).expect(201)
    const m1 = await createMilestone({ title: 'M1', sequence: 1 }).expect(201)
    await createMilestone({ title: 'M2', sequence: 2 }).expect(201)

    // Delete the middle one, leaving [0, 2]
    await request(app.getHttpServer())
      .delete(`/milestones/${m1.body.id}`)
      .set(authHeader(token))
      .expect(200)

    // Auto-assign should be 3, not 1 or 2
    const res = await createMilestone({ title: 'M3' }).expect(201)
    expect(res.body.sequence).toBe(3)
  })

  it('POST /goals/:goalId/milestones — rejects empty title', async () => {
    await createMilestone({ title: '   ' }).expect(400);
  });

  it('POST /goals/:goalId/milestones — rejects title exceeding 200 characters', async () => {
    await createMilestone({ title: 'a'.repeat(201) }).expect(400);
  });

  it('POST /goals/:goalId/milestones — rejects access to another user\'s goal', async () => {
    const otherToken = await signupAndLogin(app, 'milestones_other');
    const otherGoal = await createGoal(app, otherToken).expect(201);

    await request(app.getHttpServer())
      .post(`/goals/${otherGoal.body.id}/milestones`)
      .set(authHeader(token))
      .send({ title: 'Hijacked' })
      .expect(403);
  });

  it('POST /goals/:goalId/milestones — rejects milestone on deleted goal', async () => {
    await request(app.getHttpServer())
      .delete(`/goals/${goalId}`)
      .set(authHeader(token))
      .expect(200);

    await createMilestone({ title: 'Too late' }).expect(400);
  });

  // ─── GET /goals/:goalId/milestones ─────────────────────────────────────────

  it('GET /goals/:goalId/milestones — requires JWT', async () => {
    await request(app.getHttpServer())
      .get(`/goals/${goalId}/milestones`)
      .expect(401);
  });

  it('GET /goals/:goalId/milestones — returns milestones ordered by sequence', async () => {
    await createMilestone({ title: 'Milestone 1' }).expect(201);
    await createMilestone({ title: 'Milestone 2' }).expect(201);

    const res = await request(app.getHttpServer())
      .get(`/goals/${goalId}/milestones`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body.length).toBe(2);
    expect(res.body[0].sequence).toBeLessThan(res.body[1].sequence);
  });

  it('GET /goals/:goalId/milestones — does not return soft-deleted milestones', async () => {
    const m = await createMilestone({ title: 'To delete' }).expect(201);

    await request(app.getHttpServer())
      .delete(`/milestones/${m.body.id}`)
      .set(authHeader(token))
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/goals/${goalId}/milestones`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body.find((m: any) => m.id === m.body?.id)).toBeUndefined();
    expect(res.body.length).toBe(0);
  });

  it('GET /goals/:goalId/milestones — rejects access to another user\'s goal', async () => {
    const otherToken = await signupAndLogin(app, 'milestones_other');
    const otherGoal = await createGoal(app, otherToken).expect(201);

    await request(app.getHttpServer())
      .get(`/goals/${otherGoal.body.id}/milestones`)
      .set(authHeader(token))
      .expect(403);
  });

  // ─── PATCH /milestones/:id ─────────────────────────────────────────────────

  it('PATCH /milestones/:id — requires JWT', async () => {
    const m = await createMilestone().expect(201);

    await request(app.getHttpServer())
      .patch(`/milestones/${m.body.id}`)
      .send({ title: 'Updated' })
      .expect(401);
  });

  it('PATCH /milestones/:id — updates title and sequence', async () => {
    const m = await createMilestone({ title: 'Milestone 1' }).expect(201);

    const res = await request(app.getHttpServer())
      .patch(`/milestones/${m.body.id}`)
      .set(authHeader(token))
      .send({ title: 'Updated Milestone', sequence: 5 })
      .expect(200);

    expect(res.body.title).toBe('Updated Milestone');
    expect(res.body.sequence).toBe(5);
  });

  it('PATCH /milestones/:id — rejects empty title', async () => {
    const m = await createMilestone().expect(201);

    await request(app.getHttpServer())
      .patch(`/milestones/${m.body.id}`)
      .set(authHeader(token))
      .send({ title: '   ' })
      .expect(400);
  });

  it('PATCH /milestones/:id — rejects duplicate sequence', async () => {
    await createMilestone({ title: 'Milestone 1', sequence: 0 }).expect(201);
    const m2 = await createMilestone({ title: 'Milestone 2', sequence: 1 }).expect(201);

    await request(app.getHttpServer())
      .patch(`/milestones/${m2.body.id}`)
      .set(authHeader(token))
      .send({ sequence: 0 })
      .expect(400);
  });

  it('PATCH /milestones/:id — rejects update to another user\'s milestone', async () => {
    const otherToken = await signupAndLogin(app, 'milestones_other');
    const otherGoal = await createGoal(app, otherToken).expect(201);
    const otherMilestone = await request(app.getHttpServer())
      .post(`/goals/${otherGoal.body.id}/milestones`)
      .set(authHeader(otherToken))
      .send({ title: 'Other Milestone' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/milestones/${otherMilestone.body.id}`)
      .set(authHeader(token))
      .send({ title: 'Hijacked' })
      .expect(403);
  });

  // ─── DELETE /milestones/:id ────────────────────────────────────────────────

  it('DELETE /milestones/:id — requires JWT', async () => {
    const m = await createMilestone().expect(201);

    await request(app.getHttpServer())
      .delete(`/milestones/${m.body.id}`)
      .expect(401);
  });

  it('DELETE /milestones/:id — soft deletes a milestone', async () => {
    const m = await createMilestone({ title: 'To delete' }).expect(201);

    await request(app.getHttpServer())
      .delete(`/milestones/${m.body.id}`)
      .set(authHeader(token))
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/goals/${goalId}/milestones`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body.find((item: any) => item.id === m.body.id)).toBeUndefined();
  });

  it('DELETE /milestones/:id — sequence slot is reclaimable after soft delete', async () => {
    const m = await createMilestone({ title: 'Milestone', sequence: 0 }).expect(201);

    await request(app.getHttpServer())
      .delete(`/milestones/${m.body.id}`)
      .set(authHeader(token))
      .expect(200);

    // Sequence 0 should now be available again
    await createMilestone({ title: 'New Milestone', sequence: 0 }).expect(201);
  });

  it('DELETE /milestones/:id — rejects deleting another user\'s milestone', async () => {
    const otherToken = await signupAndLogin(app, 'milestones_other');
    const otherGoal = await createGoal(app, otherToken).expect(201);
    const otherMilestone = await request(app.getHttpServer())
      .post(`/goals/${otherGoal.body.id}/milestones`)
      .set(authHeader(otherToken))
      .send({ title: 'Other Milestone' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/milestones/${otherMilestone.body.id}`)
      .set(authHeader(token))
      .expect(403);
  });
});