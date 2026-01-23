// test/goals.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDb } from './utils/cleanup';

// End-to-end tests for Goals module
describe('Goals (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let user: { email: string; password: string; name: string };

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
      email: `goals_${Date.now()}@test.com`,
      password: 'password123',
      name: 'Goals Tester',
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
  });

  // Close the NestJS application after all tests
  afterAll(async () => {
    await cleanDb(app);
    await app.close();
  });

  // Test creating a new goal
  it('POST /goals — creates a goal', async () => {
    const res = await request(app.getHttpServer())
      .post('/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Ship MVP',
        description: 'Finish core features',
        deadline: '2026-03-01T00:00:00Z',
        category: 'startup',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Ship MVP');
    expect(res.body.description).toBe('Finish core features');
    expect(res.body.category).toBe('startup'); 
    expect(res.body.status).toBe('active');
  });

  // Test retrieving all goals for the user
  it('GET /goals — returns user goals', async () => {
    await request(app.getHttpServer())
    .post('/goals')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Ship MVP',
      description: 'Finish core features',
      deadline: '2026-03-01T00:00:00Z',
      category: 'startup',
    })
    .expect(201);

    const res = await request(app.getHttpServer())
      .get('/goals')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  // Test retrieving a specific goal by ID
  it('GET /goals/:id — returns goal with tasks & milestones', async () => {
    const goal = await request(app.getHttpServer())
    .post('/goals')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Ship MVP',
      description: 'Finish core features',
      deadline: '2026-03-01T00:00:00Z',
      category: 'startup',
    })
    .expect(201);

    const goalId = goal.body.id;

    const res = await request(app.getHttpServer())
      .get(`/goals/${goalId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.id).toBe(goalId);
    expect(res.body).toHaveProperty('milestones');
    expect(res.body).toHaveProperty('tasks');
  });

  // Test updating a specific goal
  it('PATCH /goals/:id — updates goal', async () => {
    const goal = await request(app.getHttpServer())
    .post('/goals')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Ship MVP',
      description: 'Finish core features',
      deadline: '2026-03-01T00:00:00Z',
      category: 'startup',
    })
    .expect(201);

    const goalId = goal.body.id;

    const res = await request(app.getHttpServer())
      .patch(`/goals/${goalId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Ship MVP v1',
        status: 'at_risk',
      })
      .expect(200);

    expect(res.body.title).toBe('Ship MVP v1');
    expect(res.body.status).toBe('at_risk');
  });

  // Test goal breakdown stub endpoint
  it('POST /goals/:id/breakdown — stub works', async () => {
    const goal = await request(app.getHttpServer())
    .post('/goals')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Ship MVP',
      description: 'Finish core features',
      deadline: '2026-03-01T00:00:00Z',
      category: 'startup',
    })
    .expect(201);

    const goalId = goal.body.id;

    const res = await request(app.getHttpServer())
      .post(`/goals/${goalId}/breakdown`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(res.body).toHaveProperty('message');
    expect(res.body.goalId).toBe(goalId);
  });

  // Test deleting a specific goal
  it('DELETE /goals/:id — deletes goal', async () => {
    const goal = await request(app.getHttpServer())
    .post('/goals')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Ship MVP',
      description: 'Finish core features',
      deadline: '2026-03-01T00:00:00Z',
      category: 'startup',
    })
    .expect(201);

    const goalId = goal.body.id;

    await request(app.getHttpServer())
      .delete(`/goals/${goalId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Verify deletion
    await request(app.getHttpServer())
      .get(`/goals/${goalId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  // Test accessing goals without JWT
  it('GET /goals — requires JWT', async () => {
    await request(app.getHttpServer())
      .get('/goals')
      .expect(401);
  });
});
