// test/tasks.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDb } from './utils/cleanup';

describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let user: { email: string; password: string; name: string };
  let goalId: string;

  // Initialize the NestJS application before all tests
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await cleanDb(app);

    user = {
      email: `tasks_${Date.now()}@test.com`,
      password: 'password123',
      name: 'Tasks Tester',
    };

    // Signup
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(user)
      .expect(201);

    // Login
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: user.email,
        password: user.password,
      })
      .expect(201);

    token = login.body.access_token;

    // Create goal
    const goal = await request(app.getHttpServer())
      .post('/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Goal',
        deadline: new Date().toISOString(),
      })
      .expect(201);

    goalId = goal.body.id;
  });

  afterAll(async () => {
    await cleanDb(app);
    await app.close();
  });

  it('POST /tasks — creates a task', async () => {
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal_id: goalId,
        description: 'First task',
        estimated_minutes: 30,
        priority_score: 1,
      })
      .expect(201);

    expect(res.body.goal_id).toBe(goalId);
    expect(res.body.description).toBe('First task');
    expect(res.body.estimated_minutes).toBe(30);
    expect(res.body.priority_score).toBe(1);   
    expect(res.body.status).toBe('todo');
  });

  it('GET /tasks/:id — fetches task', async () => {
    const task = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal_id: goalId,
        description: 'Fetch me',
        estimated_minutes: 15,
        priority_score: 2,
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/tasks/${task.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.description).toBe('Fetch me');
  });

  it('PATCH /tasks/:id — updates task', async () => {
    const task = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal_id: goalId,
        description: 'Old',
        estimated_minutes: 20,
        priority_score: 1,
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .patch(`/tasks/${task.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Updated',
      })
      .expect(200);

    expect(res.body.description).toBe('Updated');
  });

  it('blocks completion if dependency incomplete', async () => {
    // Create dependency task
    const dep = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal_id: goalId,
        description: 'Dependency',
        estimated_minutes: 10,
        priority_score: 1,
      })
      .expect(201);

    const dependencyTaskId = dep.body.id;

    // Create blocked task
    const task = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal_id: goalId,
        description: 'Blocked Task',
        estimated_minutes: 30,
        priority_score: 2,
      })
      .expect(201);

    const taskId = task.body.id;

    // Add dependency
    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/dependencies`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        depends_on_task_id: dependencyTaskId,
      })
      .expect(201);

    // Attempt to complete blocked task and expect failure
    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        actual_minutes: 50,
      })
      .expect(400);
  });

  it('allows completion after dependency done', async () => {
    // Create dependency task
    const dep = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal_id: goalId,
        description: 'Dependency',
        estimated_minutes: 10,
        priority_score: 1,
      })
      .expect(201);

    const dependencyTaskId = dep.body.id;

    // Create blocked task
    const task = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal_id: goalId,
        description: 'Blocked Task',
        estimated_minutes: 30,
        priority_score: 2,
      })
      .expect(201);

    const taskId = task.body.id;

    // Add dependency
    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/dependencies`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        depends_on_task_id: dependencyTaskId,
      })
      .expect(201);

    // Complete dependency
    await request(app.getHttpServer())
      .post(`/tasks/${dependencyTaskId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        actual_minutes: 10,
      })
      .expect(200);

    // Now complete blocked task
    const res = await request(app.getHttpServer())
      .post(`/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        actual_minutes: 50,
      })
      .expect(200);

    expect(res.body.status).toBe('done');
  });

  it('removes dependency and allows completion afterward', async () => {
    // Create dependency task
    const dep = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal_id: goalId,
        description: 'Dependency Task',
        estimated_minutes: 10,
        priority_score: 1,
      })
      .expect(201);

    const dependencyTaskId = dep.body.id;

    // Create blocked task
    const task = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal_id: goalId,
        description: 'Blocked Task',
        estimated_minutes: 30,
        priority_score: 2,
      })
      .expect(201);

    const taskId = task.body.id;

    // Add dependency
    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/dependencies`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        depends_on_task_id: dependencyTaskId,
      })
      .expect(201);

    // Verify completion is blocked
    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        actual_minutes: 30,
      })
      .expect(400);

    // Remove dependency
    await request(app.getHttpServer())
      .delete(`/tasks/${taskId}/dependencies/${dependencyTaskId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Now completion should succeed
    const res = await request(app.getHttpServer())
      .post(`/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        actual_minutes: 30,
      })
      .expect(200);

    expect(res.body.status).toBe('done');
  });

  it('DELETE /tasks/:id — deletes task', async () => {
    const task = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal_id: goalId,
        description: 'Delete me',
        estimated_minutes: 5,
        priority_score: 1,
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/tasks/${task.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Verify deletion
    await request(app.getHttpServer())
      .get(`/tasks/${task.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
