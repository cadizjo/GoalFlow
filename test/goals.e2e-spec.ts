import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDb } from './utils/cleanup';
import { signupAndLogin, authHeader, createGoal, createTask, completeTask, createScheduleBlock } from './utils/helpers';

describe('Goals (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await cleanDb(app);
    token = await signupAndLogin(app, 'goals');
  });

  afterAll(async () => {
    await cleanDb(app);
    await app.close();
  });

  // ─── POST /goals ───────────────────────────────────────────────────────────

  it('POST /goals — creates a goal', async () => {
    const res = await createGoal(app, token, {
      title: 'Ship MVP',
      description: 'Finish core features',
      deadline: '2030-03-01T00:00:00Z',
      category: 'startup',
    }).expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Ship MVP');
    expect(res.body.description).toBe('Finish core features');
    expect(res.body.category).toBe('startup');
    expect(res.body.status).toBe('active');
  });

  it('POST /goals — requires JWT', async () => {
    await request(app.getHttpServer())
      .post('/goals')
      .send({ title: 'No auth', deadline: '2030-01-01T00:00:00Z' })
      .expect(401);
  });

  it('POST /goals — rejects an empty title', async () => {
    await createGoal(app, token, {
      title: '   ',
      deadline: '2030-03-01T00:00:00Z',
    }).expect(400);
  });

  it('POST /goals — rejects a title exceeding 200 characters', async () => {
    await createGoal(app, token, {
      title: 'a'.repeat(201),
      deadline: '2030-03-01T00:00:00Z',
    }).expect(400);
  });

  it('POST /goals — rejects a deadline in the past', async () => {
    await createGoal(app, token, {
      title: 'Past goal',
      deadline: '2000-01-01T00:00:00Z',
    }).expect(400);
  });

  // ─── GET /goals ────────────────────────────────────────────────────────────

  it('GET /goals — requires JWT', async () => {
    await request(app.getHttpServer())
      .get('/goals')
      .expect(401);
  });

  it('GET /goals — returns user goals', async () => {
    await createGoal(app, token).expect(201);

    const res = await request(app.getHttpServer())
      .get('/goals')
      .set(authHeader(token))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  it('GET /goals — does not return soft-deleted goals', async () => {
    const goal = await createGoal(app, token).expect(201);

    await request(app.getHttpServer())
      .delete(`/goals/${goal.body.id}`)
      .set(authHeader(token))
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/goals')
      .set(authHeader(token))
      .expect(200);

    expect(res.body.find((g: any) => g.id === goal.body.id)).toBeUndefined();
  });

  it('GET /goals — only returns goals belonging to the current user', async () => {
    await createGoal(app, token).expect(201);

    // Second user creates their own goal
    const otherToken = await signupAndLogin(app, 'goals_other');
    await createGoal(app, otherToken).expect(201);

    const res = await request(app.getHttpServer())
      .get('/goals')
      .set(authHeader(token))
      .expect(200);

    expect(res.body.length).toBe(1);
  });

  // ─── GET /goals/:id ────────────────────────────────────────────────────────

  it('GET /goals/:id — returns goal with tasks and milestones', async () => {
    const goal = await createGoal(app, token).expect(201);

    const res = await request(app.getHttpServer())
      .get(`/goals/${goal.body.id}`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body.id).toBe(goal.body.id);
    expect(res.body).toHaveProperty('milestones');
    expect(res.body).toHaveProperty('tasks');
  });

  it('GET /goals/:id — returns 404 for non-existent goal', async () => {
    await request(app.getHttpServer())
      .get('/goals/non-existent-id')
      .set(authHeader(token))
      .expect(404);
  });

  it('GET /goals/:id — returns 400 for soft-deleted goal', async () => {
    const goal = await createGoal(app, token).expect(201);

    await request(app.getHttpServer())
      .delete(`/goals/${goal.body.id}`)
      .set(authHeader(token))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/goals/${goal.body.id}`)
      .set(authHeader(token))
      .expect(400);
  });

  it('GET /goals/:id — rejects access to another user\'s goal', async () => {
    const otherToken = await signupAndLogin(app, 'goals_other');
    const otherGoal = await createGoal(app, otherToken).expect(201);

    await request(app.getHttpServer())
      .get(`/goals/${otherGoal.body.id}`)
      .set(authHeader(token))
      .expect(400);
  });

  // ─── PATCH /goals/:id ──────────────────────────────────────────────────────

  it('PATCH /goals/:id — updates title and status', async () => {
    const goal = await createGoal(app, token).expect(201);

    const res = await request(app.getHttpServer())
      .patch(`/goals/${goal.body.id}`)
      .set(authHeader(token))
      .send({ title: 'Ship MVP v1', status: 'at_risk' })
      .expect(200);

    expect(res.body.title).toBe('Ship MVP v1');
    expect(res.body.status).toBe('at_risk');
  });

  it('PATCH /goals/:id — rejects invalid status transition', async () => {
    const goal = await createGoal(app, token).expect(201);

    // Mark completed first
    await request(app.getHttpServer())
      .patch(`/goals/${goal.body.id}`)
      .set(authHeader(token))
      .send({ status: 'completed' })
      .expect(200);

    // completed → at_risk is invalid
    await request(app.getHttpServer())
      .patch(`/goals/${goal.body.id}`)
      .set(authHeader(token))
      .send({ status: 'at_risk' })
      .expect(400);
  });

  it('PATCH /goals/:id — rejects moving deadline back', async () => {
    const goal = await createGoal(app, token, {
      deadline: '2030-06-01T00:00:00Z',
    }).expect(201);

    await request(app.getHttpServer())
      .patch(`/goals/${goal.body.id}`)
      .set(authHeader(token))
      .send({ deadline: '2030-01-01T00:00:00Z' })
      .expect(400);
  });

  it('PATCH /goals/:id — rejects an empty title', async () => {
    const goal = await createGoal(app, token).expect(201);

    await request(app.getHttpServer())
      .patch(`/goals/${goal.body.id}`)
      .set(authHeader(token))
      .send({ title: '   ' })
      .expect(400);
  });

  it('PATCH /goals/:id — rejects update to another user\'s goal', async () => {
    const otherToken = await signupAndLogin(app, 'goals_other');
    const otherGoal = await createGoal(app, otherToken).expect(201);

    await request(app.getHttpServer())
      .patch(`/goals/${otherGoal.body.id}`)
      .set(authHeader(token))
      .send({ title: 'Hijacked' })
      .expect(400);
  });

  // ─── DELETE /goals/:id ─────────────────────────────────────────────────────

  it('DELETE /goals/:id — soft deletes a goal', async () => {
    const goal = await createGoal(app, token).expect(201);

    await request(app.getHttpServer())
      .delete(`/goals/${goal.body.id}`)
      .set(authHeader(token))
      .expect(200);

    // Soft-deleted goal is no longer accessible
    await request(app.getHttpServer())
      .get(`/goals/${goal.body.id}`)
      .set(authHeader(token))
      .expect(400);
  });

  it('DELETE /goals/:id — rejects deleting a completed goal', async () => {
    const goal = await createGoal(app, token).expect(201);

    await request(app.getHttpServer())
      .patch(`/goals/${goal.body.id}`)
      .set(authHeader(token))
      .send({ status: 'completed' })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/goals/${goal.body.id}`)
      .set(authHeader(token))
      .expect(400);
  });

  it('DELETE /goals/:id — rejects deleting another user\'s goal', async () => {
    const otherToken = await signupAndLogin(app, 'goals_other');
    const otherGoal = await createGoal(app, otherToken).expect(201);

    await request(app.getHttpServer())
      .delete(`/goals/${otherGoal.body.id}`)
      .set(authHeader(token))
      .expect(400);
  });

  // ─── POST /goals/:id/breakdown ─────────────────────────────────────────────

  it('POST /goals/:id/breakdown — stub returns message and goalId', async () => {
    const goal = await createGoal(app, token).expect(201);

    const res = await request(app.getHttpServer())
      .post(`/goals/${goal.body.id}/breakdown`)
      .set(authHeader(token))
      .expect(201);

    expect(res.body).toHaveProperty('message');
    expect(res.body.goalId).toBe(goal.body.id);
  });

  // ─── Cascade deletions ─────────────────────────────────────────────────────

  it('DELETE /goals/:id — soft deletes incomplete tasks when goal is deleted', async () => {
    const goal = await createGoal(app, token).expect(201);
    const task = await createTask(app, token, goal.body.id);

    await request(app.getHttpServer())
      .delete(`/goals/${goal.body.id}`)
      .set(authHeader(token))
      .expect(200);

    // Task should no longer be accessible
    await request(app.getHttpServer())
      .get(`/tasks/${task.id}`)
      .set(authHeader(token))
      .expect(404);
  });

  it('DELETE /goals/:id — does not soft delete completed tasks when goal is deleted', async () => {
    const goal = await createGoal(app, token).expect(201);
    const task = await createTask(app, token, goal.body.id);

    await completeTask(app, token, task.id, 30).expect(201);

    await request(app.getHttpServer())
      .delete(`/goals/${goal.body.id}`)
      .set(authHeader(token))
      .expect(200);

    // Completed task is excluded from cascade — still accessible
    const res = await request(app.getHttpServer())
      .get(`/tasks/${task.id}`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body.status).toBe('done');
  });

  it('DELETE /goals/:id — deletes future schedule blocks for cascaded tasks', async () => {
    const goal = await createGoal(app, token).expect(201);
    const task = await createTask(app, token, goal.body.id);
    const block = await createScheduleBlock(app, token, task.id).expect(201);

    await request(app.getHttpServer())
      .delete(`/goals/${goal.body.id}`)
      .set(authHeader(token))
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/schedule-blocks')
      .set(authHeader(token))
      .expect(200);

    expect(res.body.find((b: any) => b.id === block.body.id)).toBeUndefined();
  });
});