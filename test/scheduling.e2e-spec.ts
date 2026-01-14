import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDb } from './utils/cleanup';

describe('ScheduleBlocks (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let taskId: string;

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

    // signup
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'schedule@test.com',
        password: 'password123',
        name: 'Scheduler',
      });

    // login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'schedule@test.com',
        password: 'password123',
      });

    token = loginRes.body.access_token;

    // create goal
    const goalRes = await request(app.getHttpServer())
      .post('/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Goal',
        deadline: new Date().toISOString(),
      });

    // create task
    const taskRes = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal_id: goalRes.body.id,
        description: 'Test Task',
        estimated_minutes: 30,
        priority_score: 1,
      });

    taskId = taskRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /schedule-blocks — creates a block', async () => {
    const res = await request(app.getHttpServer())
      .post('/schedule-blocks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        task_id: taskId,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 30 * 60000).toISOString(),
        source: 'manual',
        status: 'scheduled',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.task_id).toBe(taskId);
    expect(res.body.source).toBe('manual');
    expect(res.body.status).toBe('scheduled');
  });

  it('GET /schedule-blocks — returns user blocks only', async () => {
    await request(app.getHttpServer())
      .post('/schedule-blocks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        task_id: taskId,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 60000).toISOString(),
        source: 'manual',
        status: 'scheduled',
      });

    const res = await request(app.getHttpServer())
      .get('/schedule-blocks')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.length).toBe(1);
  });

  it('PATCH /schedule-blocks/:id — updates block', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/schedule-blocks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        task_id: taskId,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 60000).toISOString(),
        source: 'manual',
        status: 'scheduled',
      });

    const blockId = createRes.body.id;

    const res = await request(app.getHttpServer())
      .patch(`/schedule-blocks/${blockId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' })
      .expect(200);

    expect(res.body.status).toBe('completed');
  });

  it('DELETE /schedule-blocks/:id — deletes block', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/schedule-blocks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        task_id: taskId,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 60000).toISOString(),
        source: 'manual',
        status: 'scheduled',
      });

    await request(app.getHttpServer())
      .delete(`/schedule-blocks/${createRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
