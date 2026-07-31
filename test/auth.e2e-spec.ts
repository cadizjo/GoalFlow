import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { cleanDb } from './utils/cleanup';
import { createTestApp } from './utils/create-test-app';
import { signupAndLogin, authHeader } from './utils/helpers';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanDb(app);
  });

  afterAll(async () => {
    await cleanDb(app);
    await app.close();
  });

  // ─── Signup ────────────────────────────────────────────────────────────────

  it('POST /auth/signup — creates a user and returns a token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: `auth_${Date.now()}@test.com`,
        password: 'password123',
        name: 'Auth Tester',
      })
      .expect(201);

    expect(res.body.access_token).toBeDefined();
  });

  it('POST /auth/signup — rejects duplicate email', async () => {
    const email = `auth_${Date.now()}@test.com`;

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password: 'password123', name: 'Auth Tester' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password: 'password123', name: 'Auth Tester' })
      .expect(400);
  });

  it('POST /auth/signup — rejects a weak password', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: `auth_${Date.now()}@test.com`,
        password: 'short',
        name: 'Auth Tester',
      })
      .expect(400);
  });

  it('POST /auth/signup — rejects an invalid email', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'not-an-email',
        password: 'password123',
        name: 'Auth Tester',
      })
      .expect(400);
  });

  // ─── Login ─────────────────────────────────────────────────────────────────

  it('POST /auth/login — returns a token for valid credentials', async () => {
    const email = `auth_${Date.now()}@test.com`;

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password: 'password123', name: 'Auth Tester' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'password123' })
      .expect(201);

    expect(res.body.access_token).toBeDefined();
  });

  it('POST /auth/login — rejects an invalid password', async () => {
    const email = `auth_${Date.now()}@test.com`;

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password: 'password123', name: 'Auth Tester' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrongpassword' })
      .expect(401);
  });

  it('POST /auth/login — rejects a non-existent user', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ghost@test.com', password: 'password123' })
      .expect(401);
  });

  // ─── Protected route smoke test ────────────────────────────────────────────

  it('GET /users/me — rejects request without a token', async () => {
    await request(app.getHttpServer())
      .get('/users/me')
      .expect(401);
  });

  it('GET /users/me — returns user for valid token', async () => {
    const token = await signupAndLogin(app, 'auth');

    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set(authHeader(token))
      .expect(200);

    expect(res.body.email).toContain('auth_');
  });

  // ─── Rate limiting ─────────────────────────────────────────────────────────
  // These tests run against a separate app instance with real throttler limits
  // so they don't interfere with the overridden limits used in other tests

  // it('POST /auth/login — returns 429 after exceeding rate limit', async () => {
  //   const { Test } = await import('@nestjs/testing');
  //   const { AppModule } = await import('../src/app.module');

  //   const throttledModule = await Test.createTestingModule({
  //     imports: [AppModule],
  //   }).compile();

  //   const throttledApp = throttledModule.createNestApplication();
  //   await throttledApp.init();

  //   const email = `throttle_${Date.now()}@test.com`;

  //   // Exhaust the 10 req/min auth limit
  //   const requests = Array.from({ length: 10 }, () =>
  //     request(throttledApp.getHttpServer())
  //       .post('/auth/login')
  //       .send({ email, password: 'password123' }),
  //   );
  //   await Promise.all(requests);

  //   await request(throttledApp.getHttpServer())
  //     .post('/auth/login')
  //     .send({ email, password: 'password123' })
  //     .expect(429);

  //   await throttledApp.close();
  // });

  // it('POST /auth/signup — returns 429 after exceeding rate limit', async () => {
  //   const { Test } = await import('@nestjs/testing');
  //   const { AppModule } = await import('../src/app.module');

  //   const throttledModule = await Test.createTestingModule({
  //     imports: [AppModule],
  //   }).compile();

  //   const throttledApp = throttledModule.createNestApplication();
  //   await throttledApp.init();

  //   const requests = Array.from({ length: 10 }, (_, i) =>
  //     request(throttledApp.getHttpServer())
  //       .post('/auth/signup')
  //       .send({
  //         email: `throttle_${Date.now()}_${i}@test.com`,
  //         password: 'password123',
  //         name: 'Tester',
  //       }),
  //   );
  //   await Promise.all(requests);

  //   await request(throttledApp.getHttpServer())
  //     .post('/auth/signup')
  //     .send({
  //       email: `throttle_last_${Date.now()}@test.com`,
  //       password: 'password123',
  //       name: 'Tester',
  //     })
  //     .expect(429);

  //   await throttledApp.close();
  // });
});