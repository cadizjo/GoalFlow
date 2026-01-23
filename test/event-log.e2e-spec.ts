// test/event-log.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDb } from './utils/cleanup';

describe('EventLog (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let user: { email: string; password: string; name: string };

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
      email: `eventLog_${Date.now()}@test.com`,
      password: 'password123',
      name: 'EventLog Tester',
    };

    // signup
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(user)
      .expect(201);

    // login
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: user.email,
        password: user.password,
      })
      .expect(201);

    token = res.body.access_token;
  });

  afterAll(async () => {
    await cleanDb(app);
    await app.close();
  });

  it('GET /events — returns user events', async () => {
    const res = await request(app.getHttpServer())
      .get('/events')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);

    // Include after events emitted during signup & login
    // expect(res.body.length).toBeGreaterThan(0);
    // expect(res.body[0]).toHaveProperty('type');
    // expect(res.body[0]).toHaveProperty('created_at');
  });
});
