// test/milestones.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDb } from './utils/cleanup';

// End-to-end tests for Milestones module
describe('Milestones (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let user: { email: string; password: string; name: string };
  let goalId: string;

  // Initialize the NestJS application before all tests
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await cleanDb(app);

    user = {
      email: `milestones_${Date.now()}@test.com`,
      password: 'password123',
      name: 'Milestones Tester',
    };

    // Signup & login once
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(user)
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: user.email,
        password: user.password,
      })
      .expect(201);

    // Save the JWT token for authenticated requests
    token = res.body.access_token;

    // Create goal
    const goalRes = await request(app.getHttpServer())
      .post('/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Goal',
        deadline: new Date().toISOString(),
      })
      .expect(201);

    goalId = goalRes.body.id;
  });

  // Close the NestJS application after all tests
  afterAll(async () => {
    await cleanDb(app);
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
  });

  it('POST /goals/:goalId/milestones — appends sequence automatically', async () => {
    await request(app.getHttpServer())
      .post(`/goals/${goalId}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Milestone 1',
      })
      .expect(201);

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
    await request(app.getHttpServer())
      .post(`/goals/${goalId}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Milestone 1',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/goals/${goalId}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Milestone 2',
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/goals/${goalId}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.length).toBe(2);
    expect(res.body[0].sequence).toBeLessThan(res.body[1].sequence);
  });

  it('PATCH /milestones/:id — updates milestone', async () => {
    const milestone = await request(app.getHttpServer())
      .post(`/goals/${goalId}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Milestone 1',
      })
      .expect(201);

    const milestoneId = milestone.body.id;

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
    const milestone = await request(app.getHttpServer())
      .post(`/goals/${goalId}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Milestone 1',
      })
      .expect(201);

    const milestoneId = milestone.body.id;

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

  it('POST /goals/:goalId/milestones — rejects unauthorized access', async () => {
    await request(app.getHttpServer())
      .post(`/goals/${goalId}/milestones`)
      .send({ title: 'Should Fail' })
      .expect(401);
  });
});
