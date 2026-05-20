import request from 'supertest';
import { INestApplication } from '@nestjs/common';

// ─── Auth ────────────────────────────────────────────────────────────────────

export const signupAndLogin = async (
  app: INestApplication,
  prefix = 'user',
): Promise<string> => {
  const email = `${prefix}_${Date.now()}@test.com`;

  await request(app.getHttpServer())
    .post('/auth/signup')
    .send({ email, password: 'password123', name: 'Tester' })
    .expect(201);

  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: 'password123' })
    .expect(201);

  return res.body.access_token;
};

export const authHeader = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

// ─── Goals ───────────────────────────────────────────────────────────────────

export const createGoal = async (
  app: INestApplication,
  token: string,
  overrides: Partial<any> = {},
): Promise<any> => {
  const res = await request(app.getHttpServer())
    .post('/goals')
    .set(authHeader(token))
    .send({
      title: `Goal ${Date.now()}`,
      deadline: new Date().toISOString(),
      ...overrides,
    })
    .expect(201);

  return res.body;
};

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const createTask = async (
  app: INestApplication,
  token: string,
  goalId: string,
  overrides: Partial<any> = {},
): Promise<any> => {
  const res = await request(app.getHttpServer())
    .post('/tasks')
    .set(authHeader(token))
    .send({
      goal_id: goalId,
      description: 'Task',
      estimated_minutes: 30,
      priority_score: 1,
      ...overrides,
    })
    .expect(201);

  return res.body;
};

export const completeTask = (
  app: INestApplication,
  token: string,
  taskId: string,
  actualMinutes = 10,
) =>
  request(app.getHttpServer())
    .post(`/tasks/${taskId}/complete`)
    .set(authHeader(token))
    .send({ actual_minutes: actualMinutes });

export const addDependency = (
  app: INestApplication,
  token: string,
  taskId: string,
  dependsOnId: string,
) =>
  request(app.getHttpServer())
    .post(`/tasks/${taskId}/dependencies`)
    .set(authHeader(token))
    .send({ depends_on_task_id: dependsOnId });

export const removeDependency = (
  app: INestApplication,
  token: string,
  taskId: string,
  dependsOnId: string,
) =>
  request(app.getHttpServer())
    .delete(`/tasks/${taskId}/dependencies/${dependsOnId}`)
    .set(authHeader(token));

// ─── Schedule Blocks ─────────────────────────────────────────────────────────

export const DEFAULT_START = new Date('2030-01-01T10:00:00Z');
export const DEFAULT_END = new Date('2030-01-01T10:30:00Z');

export const createScheduleBlock = (
  app: INestApplication,
  token: string,
  taskId: string,
  overrides: Partial<any> = {},
) =>
  request(app.getHttpServer())
    .post('/schedule-blocks')
    .set(authHeader(token))
    .send({
      task_id: taskId,
      start_time: DEFAULT_START,
      end_time: DEFAULT_END,
      source: 'manual',
      ...overrides,
    });

export const completeScheduleBlock = (
  app: INestApplication,
  token: string,
  blockId: string,
) =>
  request(app.getHttpServer())
    .post(`/schedule-blocks/${blockId}/complete`)
    .set(authHeader(token));