import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDb } from './utils/cleanup';

describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let goalId: string;
  let taskId: string;
  let dependencyTaskId: string;

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

    // Signup
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'task@test.com',
        password: 'password123',
        name: 'Task Tester',
      });

    // Login
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'task@test.com',
        password: 'password123',
      });

    token = login.body.access_token;

    // Create goal
    const goal = await request(app.getHttpServer())
      .post('/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Goal',
        deadline: new Date().toISOString(),
      });

    goalId = goal.body.id;
  });

  afterAll(async () => {
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

    taskId = res.body.id;
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
      });

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
      });

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
      });

    dependencyTaskId = dep.body.id;

    // Create blocked task
    const task = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal_id: goalId,
        description: 'Blocked Task',
        estimated_minutes: 30,
        priority_score: 2,
      });

    taskId = task.body.id;

    // Add dependency
    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/dependencies`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        dependsOnTaskId: dependencyTaskId,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        actualMinutes: 50,
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
      });

    dependencyTaskId = dep.body.id;

    // Create blocked task
    const task = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal_id: goalId,
        description: 'Blocked Task',
        estimated_minutes: 30,
        priority_score: 2,
      });

    taskId = task.body.id;

    // Add dependency
    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/dependencies`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        dependsOnTaskId: dependencyTaskId,
      })
      .expect(201);

    // Complete dependency
    await request(app.getHttpServer())
      .post(`/tasks/${dependencyTaskId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        actualMinutes: 10,
      })
      .expect(201);

    // Now complete blocked task
    const res = await request(app.getHttpServer())
      .post(`/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        actualMinutes: 50,
      })
      .expect(201);

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
      });

    await request(app.getHttpServer())
      .delete(`/tasks/${task.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
