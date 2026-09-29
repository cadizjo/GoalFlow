import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDb } from './utils/cleanup';
import {
  signupAndLogin,
  authHeader,
  createGoal,
  createTask,
  completeTask,
  addDependency,
  removeDependency,
} from './utils/helpers';
import { createTestApp } from './utils/create-test-app';

describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let goalId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanDb(app);
    token = await signupAndLogin(app, 'tasks');
    const goal = await createGoal(app, token).expect(201);
    goalId = goal.body.id;
  });

  afterAll(async () => {
    await cleanDb(app);
    await app.close();
  });

  // ─── Core CRUD ─────────────────────────────────────────────────────────────

  it('creates and fetches a task', async () => {
    const task = await createTask(app, token, goalId, { description: 'Fetch me' });

    const res = await request(app.getHttpServer())
      .get(`/tasks/${task.id}`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body.description).toBe('Fetch me');
  });

  it('updates task fields (non-status)', async () => {
    const task = await createTask(app, token, goalId);

    const res = await request(app.getHttpServer())
      .patch(`/tasks/${task.id}`)
      .set(authHeader(token))
      .send({ description: 'Updated' })
      .expect(200);

    expect(res.body.description).toBe('Updated');
  });

  // ─── Status invariants ─────────────────────────────────────────────────────

  it('rejects completing via PATCH (must use /complete)', async () => {
    const task = await createTask(app, token, goalId);

    await request(app.getHttpServer())
      .patch(`/tasks/${task.id}`)
      .set(authHeader(token))
      .send({ status: 'done' })
      .expect(400);
  });

  it('enforces valid status transitions', async () => {
    const task = await createTask(app, token, goalId);

    // todo → blocked is invalid
    await request(app.getHttpServer())
      .patch(`/tasks/${task.id}`)
      .set(authHeader(token))
      .send({ status: 'blocked' })
      .expect(400);
  });

  // ─── Completion invariants ─────────────────────────────────────────────────

  it('blocks completion when dependencies are incomplete', async () => {
    const dep = await createTask(app, token, goalId, { description: 'Dependency' });
    const task = await createTask(app, token, goalId, { description: 'Blocked' });

    await addDependency(app, token, task.id, dep.id).expect(201);

    await completeTask(app, token, task.id).expect(400);
  });

  it('allows completion after dependencies complete', async () => {
    const dep = await createTask(app, token, goalId);
    const task = await createTask(app, token, goalId);

    await addDependency(app, token, task.id, dep.id).expect(201);
    await completeTask(app, token, dep.id).expect(201);

    const res = await completeTask(app, token, task.id, 50).expect(201);
    expect(res.body.status).toBe('done');
  });

  it('rejects completion without actual minutes', async () => {
    const task = await createTask(app, token, goalId);

    await request(app.getHttpServer())
      .post(`/tasks/${task.id}/complete`)
      .set(authHeader(token))
      .send({})
      .expect(400);
  });

  // ─── Dependency invariants ─────────────────────────────────────────────────

  it('rejects self-dependency', async () => {
    const task = await createTask(app, token, goalId);

    await addDependency(app, token, task.id, task.id).expect(400);
  });

  it('rejects cross-goal dependencies', async () => {
    const goalA = await createGoal(app, token).expect(201);
    const goalB = await createGoal(app, token).expect(201);

    const taskInGoalA = await createTask(app, token, goalA.body.id, { description: 'Task in Goal A' });
    const taskInGoalB = await createTask(app, token, goalB.body.id, { description: 'Task in Goal B' });

    await addDependency(app, token, taskInGoalA.id, taskInGoalB.id).expect(400);
  });

  it('rejects circular dependencies', async () => {
    const a = await createTask(app, token, goalId, { description: 'A' });
    const b = await createTask(app, token, goalId, { description: 'B' });
    const c = await createTask(app, token, goalId, { description: 'C' });

    await addDependency(app, token, b.id, a.id).expect(201);
    await addDependency(app, token, c.id, b.id).expect(201);

    // A → C creates a cycle
    await addDependency(app, token, a.id, c.id).expect(400);
  });

  it('allows dependency removal and then completion', async () => {
    const dep = await createTask(app, token, goalId);
    const task = await createTask(app, token, goalId);

    await addDependency(app, token, task.id, dep.id).expect(201);
    await completeTask(app, token, task.id).expect(400);

    await removeDependency(app, token, task.id, dep.id).expect(200);

    await completeTask(app, token, task.id).expect(201);
  });

  // ─── Deletion invariants ───────────────────────────────────────────────────

  it('blocks deletion when dependents are incomplete', async () => {
    const parent = await createTask(app, token, goalId);
    const child = await createTask(app, token, goalId);

    await addDependency(app, token, child.id, parent.id).expect(201);

    await request(app.getHttpServer())
      .delete(`/tasks/${parent.id}`)
      .set(authHeader(token))
      .expect(400);
  });

  it('deletes task when deletable', async () => {
    const task = await createTask(app, token, goalId);

    await request(app.getHttpServer())
      .delete(`/tasks/${task.id}`)
      .set(authHeader(token))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/tasks/${task.id}`)
      .set(authHeader(token))
      .expect(404);
  });

  it('allows valid status transition via PATCH', async () => {
    const task = await createTask(app, token, goalId);

    const res = await request(app.getHttpServer())
      .patch(`/tasks/${task.id}`)
      .set(authHeader(token))
      .send({ status: 'in_progress' })
      .expect(200);

    expect(res.body.status).toBe('in_progress');
  });

  it('rejects task creation for a goal not owned by the user', async () => {
    const otherToken = await signupAndLogin(app, 'tasks_other');
    const otherGoal = await createGoal(app, otherToken).expect(201);

    await request(app.getHttpServer())
      .post('/tasks')
      .set(authHeader(token))
      .send({
        goal_id: otherGoal.body.id,
        description: 'Hijacked task',
        estimated_minutes: 30,
        priority_score: 1,
      })
      .expect(403);
  });

  // ─── GET /goals/:goalId/tasks ──────────────────────────────────────────────

  it('GET /goals/:goalId/tasks — requires JWT', async () => {
    await request(app.getHttpServer())
      .get(`/goals/${goalId}/tasks`)
      .expect(401);
  });

  it('GET /goals/:goalId/tasks — returns tasks for the goal', async () => {
    await createTask(app, token, goalId, { description: 'Task A' });
    await createTask(app, token, goalId, { description: 'Task B' });

    const res = await request(app.getHttpServer())
      .get(`/goals/${goalId}/tasks`)
      .set(authHeader(token))
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.hasMore).toBe(false);
    expect(res.body.nextCursor).toBeNull();
  });

  it('GET /goals/:goalId/tasks — does not return soft-deleted tasks', async () => {
    const task = await createTask(app, token, goalId);

    await request(app.getHttpServer())
      .delete(`/tasks/${task.id}`)
      .set(authHeader(token))
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/goals/${goalId}/tasks`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body.data.find((t: any) => t.id === task.id)).toBeUndefined();
  });

  it('GET /goals/:goalId/tasks — rejects access to another user\'s goal', async () => {
    const otherToken = await signupAndLogin(app, 'tasks_other');
    const otherGoal = await createGoal(app, otherToken).expect(201);

    await request(app.getHttpServer())
      .get(`/goals/${otherGoal.body.id}/tasks`)
      .set(authHeader(token))
      .expect(403);
  });

  it('GET /goals/:goalId/tasks — paginates results with cursor', async () => {
    await createTask(app, token, goalId, { description: 'Task A' });
    await createTask(app, token, goalId, { description: 'Task B' });
    await createTask(app, token, goalId, { description: 'Task C' });

    // First page of 2
    const page1 = await request(app.getHttpServer())
      .get(`/goals/${goalId}/tasks?limit=2`)
      .set(authHeader(token))
      .expect(200);

    expect(page1.body.data.length).toBe(2);
    expect(page1.body.hasMore).toBe(true);
    expect(page1.body.nextCursor).toBeDefined();

    // Second page using cursor
    const page2 = await request(app.getHttpServer())
      .get(`/goals/${goalId}/tasks?limit=2&cursor=${page1.body.nextCursor}`)
      .set(authHeader(token))
      .expect(200);

    expect(page2.body.data.length).toBe(1);
    expect(page2.body.hasMore).toBe(false);
    expect(page2.body.nextCursor).toBeNull();

    // No overlap between pages
    const page1Ids = page1.body.data.map((t: any) => t.id);
    const page2Ids = page2.body.data.map((t: any) => t.id);
    expect(page1Ids.some((id: string) => page2Ids.includes(id))).toBe(false);
  });

  it('GET /goals/:goalId/tasks — returns 400 for deleted goal', async () => {
    await request(app.getHttpServer())
      .delete(`/goals/${goalId}`)
      .set(authHeader(token))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/goals/${goalId}/tasks`)
      .set(authHeader(token))
      .expect(400);
  });
});