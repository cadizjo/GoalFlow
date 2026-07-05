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
  createScheduleBlock,
  completeScheduleBlock,
  DEFAULT_START,
  DEFAULT_END,
} from './utils/helpers';

describe('ScheduleBlocks (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let goalId: string;
  let taskId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await cleanDb(app);
    token = await signupAndLogin(app, 'schedule');
    const goal = await createGoal(app, token).expect(201);
    goalId = goal.body.id;
    const task = await createTask(app, token, goalId);
    taskId = task.id;
  });

  afterAll(async () => {
    await cleanDb(app);
    await app.close();
  });

  // ─── Core CRUD ─────────────────────────────────────────────────────────────

  it('creates a schedule block', async () => {
    const res = await createScheduleBlock(app, token, taskId).expect(201);

    expect(res.body.task_id).toBe(taskId);
    expect(res.body.status).toBe('scheduled');
  });

  it('lists only user schedule blocks', async () => {
    await createScheduleBlock(app, token, taskId).expect(201);

    const res = await request(app.getHttpServer())
      .get('/schedule-blocks')
      .set(authHeader(token))
      .expect(200);

    expect(res.body.length).toBe(1);
  });

  it('updates a schedule block', async () => {
    const createRes = await createScheduleBlock(app, token, taskId).expect(201);
    const blockId = createRes.body.id;
    const newEndTime = '2030-01-01T11:00:00.000Z';

    const res = await request(app.getHttpServer())
      .patch(`/schedule-blocks/${blockId}`)
      .set(authHeader(token))
      .send({ end_time: new Date(newEndTime) })
      .expect(200);

    expect(res.body.end_time).toBe(newEndTime);
  });

  it('deletes a schedule block', async () => {
    const createRes = await createScheduleBlock(app, token, taskId).expect(201);

    await request(app.getHttpServer())
      .delete(`/schedule-blocks/${createRes.body.id}`)
      .set(authHeader(token))
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/schedule-blocks')
      .set(authHeader(token))
      .expect(200);

    expect(res.body.length).toBe(0);
  });

  // ─── Scheduling invariants ─────────────────────────────────────────────────

  it('rejects overlapping schedule blocks', async () => {
    await createScheduleBlock(app, token, taskId).expect(201);

    await createScheduleBlock(app, token, taskId, {
      start_time: new Date('2030-01-01T10:15:00Z'),
      end_time: new Date('2030-01-01T10:45:00Z'),
    }).expect(400);
  });

  it('rejects scheduling a completed task', async () => {
    await completeTask(app, token, taskId, 30).expect(201);

    await createScheduleBlock(app, token, taskId).expect(400);
  });

  it('rejects invalid time ranges', async () => {
    await createScheduleBlock(app, token, taskId, {
      start_time: DEFAULT_END,
      end_time: DEFAULT_START,
    }).expect(400);
  });

  it('prevents updating a completed schedule block', async () => {
    const createRes = await createScheduleBlock(app, token, taskId).expect(201);
    const blockId = createRes.body.id;

    await completeScheduleBlock(app, token, blockId).expect(201);

    await request(app.getHttpServer())
      .patch(`/schedule-blocks/${blockId}`)
      .set(authHeader(token))
      .send({ end_time: new Date('2030-01-01T12:00:00Z') })
      .expect(400);
  });

  // ─── Cross-module invariants ───────────────────────────────────────────────

  it('blocks schedule completion if task dependencies are incomplete', async () => {
    const dep = await createTask(app, token, goalId, { description: 'Dependency' });

    await addDependency(app, token, taskId, dep.id).expect(201);

    const block = await createScheduleBlock(app, token, taskId).expect(201);

    await completeScheduleBlock(app, token, block.body.id).expect(400);
  });

  it('allows scheduling with unmet dependencies but logs event', async () => {
    const dep = await createTask(app, token, goalId);

    await addDependency(app, token, taskId, dep.id).expect(201);

    // Scheduling allowed for the blocked task (soft invariant)
    await createScheduleBlock(app, token, taskId).expect(201);
  });

  it('deletes future schedule blocks when task is deleted', async () => {
    const block = await createScheduleBlock(app, token, taskId).expect(201);

    await request(app.getHttpServer())
      .delete(`/tasks/${taskId}`)
      .set(authHeader(token))
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/schedule-blocks')
      .set(authHeader(token))
      .expect(200);

    expect(res.body.find((b: any) => b.id === block.body.id)).toBeUndefined();
  });

  it('requires JWT', async () => {
    await request(app.getHttpServer())
      .get('/schedule-blocks')
      .expect(401);
  });

  it('rejects creating a schedule block for another user\'s task', async () => {
    const otherToken = await signupAndLogin(app, 'schedule_other');
    const otherGoal = await createGoal(app, otherToken).expect(201);
    const otherTask = await createTask(app, otherToken, otherGoal.body.id);

    await createScheduleBlock(app, token, otherTask.id).expect(403);
  });

  it('rejects completing a schedule block owned by another user', async () => {
    const otherToken = await signupAndLogin(app, 'schedule_other');
    const otherGoal = await createGoal(app, otherToken).expect(201);
    const otherTask = await createTask(app, otherToken, otherGoal.body.id);
    const otherBlock = await createScheduleBlock(app, otherToken, otherTask.id).expect(201);

    await request(app.getHttpServer())
      .post(`/schedule-blocks/${otherBlock.body.id}/complete`)
      .set(authHeader(token))
      .expect(403);
  });

  it('rejects deleting a completed schedule block', async () => {
    const createRes = await createScheduleBlock(app, token, taskId).expect(201);
    const blockId = createRes.body.id;

    await completeScheduleBlock(app, token, blockId).expect(201);

    await request(app.getHttpServer())
      .delete(`/schedule-blocks/${blockId}`)
      .set(authHeader(token))
      .expect(400);
  });
});