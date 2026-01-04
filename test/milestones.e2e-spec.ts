import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDb } from './utils/cleanup';

// End-to-end tests for Milestones module
describe('Milestones (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let goalId: string;
  let milestoneId: string;

  // Initialize the NestJS application before all tests
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    await cleanDb();

    // Create user
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'milestones@test.com',
        password: 'password123',
        name: 'Milestone Tester',
      });

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'milestones@test.com',
        password: 'password123',
      });

    token = loginRes.body.access_token;

    // Create goal
    const goalRes = await request(app.getHttpServer())
      .post('/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Goal',
        deadline: new Date().toISOString(),
      });

    goalId = goalRes.body.id;
  });

  // Close the NestJS application after all tests
  afterAll(async () => {
    await app.close();
  });

  it('POST /goals/:goalId/milestones — creates a milestone', async () => {
    const res = await request(app.getHttpServer())
      .post(`/goals/${goalId}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Milestone 1',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Milestone 1');
    expect(res.body.sequence).toBe(0);

    milestoneId = res.body.id;
  });

  it('POST /goals/:goalId/milestones — appends sequence automatically', async () => {
    const res = await request(app.getHttpServer())
      .post(`/goals/${goalId}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Milestone 2',
      })
      .expect(201);

    expect(res.body.sequence).toBe(1);
  });

  it('GET /goals/:goalId/milestones — returns ordered milestones', async () => {
    const res = await request(app.getHttpServer())
      .get(`/goals/${goalId}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.length).toBe(2);
    expect(res.body[0].sequence).toBeLessThan(res.body[1].sequence);
  });

  it('PATCH /milestones/:id — updates milestone', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/milestones/${milestoneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Updated Milestone',
        sequence: 5,
      })
      .expect(200);

    expect(res.body.title).toBe('Updated Milestone');
    expect(res.body.sequence).toBe(5);
  });

  it('DELETE /milestones/:id — deletes milestone', async () => {
    await request(app.getHttpServer())
      .delete(`/milestones/${milestoneId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Verify deletion
    const res = await request(app.getHttpServer())
      .get(`/goals/${goalId}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.find(m => m.id === milestoneId)).toBeUndefined();
  });

  it('rejects unauthorized access', async () => {
    await request(app.getHttpServer())
      .post(`/goals/${goalId}/milestones`)
      .send({ title: 'Should Fail' })
      .expect(401);
  });
});
