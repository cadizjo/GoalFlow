// test/scheduling.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDb } from './utils/cleanup';

describe('ScheduleBlocks (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let user: { email: string; password: string; name: string };
  let taskId: string;
  
  const start = new Date('2030-01-01T10:00:00Z');
  const end = new Date('2030-01-01T10:30:00Z');

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
      email: `scheduling_${Date.now()}@test.com`,
      password: 'password123',
      name: 'Scheduling Tester',
    };

    // signup
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(user)
      .expect(201);

    // login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: user.email,
        password: user.password,
      })
      .expect(201);

    token = loginRes.body.access_token;

    // create goal
    const goalRes = await request(app.getHttpServer())
      .post('/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Goal',
        deadline: new Date().toISOString(),
      })
      .expect(201);

    // create task
    const taskRes = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal_id: goalRes.body.id,
        description: 'Test Task',
        estimated_minutes: 30,
        priority_score: 1,
      })
      .expect(201);

    taskId = taskRes.body.id;
  });

  afterAll(async () => {
    await cleanDb(app);
    await app.close();
  });

  it('POST /schedule-blocks — creates a block', async () => {
    const res = await request(app.getHttpServer())
      .post('/schedule-blocks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        task_id: taskId,
        start_time: start,
        end_time: end,
        source: 'manual',
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
        start_time: start,
        end_time: end,
        source: 'manual',
      })
      .expect(201);

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
        start_time: start,
        end_time: end,
        source: 'manual',
      })
      .expect(201);

    const blockId = createRes.body.id;

    const res = await request(app.getHttpServer())
      .patch(`/schedule-blocks/${blockId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ end_time: new Date('2030-01-01T11:00:00Z') })
      .expect(200);

    expect(res.body.end_time).toBe('2030-01-01T11:00:00.000Z');
  });

  it('DELETE /schedule-blocks/:id — deletes block', async () => {
    const res = await request(app.getHttpServer())
      .post('/schedule-blocks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        task_id: taskId,
        start_time: start,
        end_time: end,
        source: 'manual',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/schedule-blocks/${res.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Verify deletion
    const blocks = await request(app.getHttpServer())
      .get('/schedule-blocks')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(blocks.body.find(b => b.id === res.body.id)).toBeUndefined();

  });
});
