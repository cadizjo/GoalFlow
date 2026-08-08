import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
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
});

// ─── Rate limiting ───────────────────────────────────────────────────────────
// Separate describe block with real throttle limits applied via env vars.
// The main suite runs with THROTTLE_AUTH_LIMIT=10000 from .env.test.
// Here we temporarily set it to 10 before building the app, then restore it.

// describe('Auth rate limiting (e2e)', () => {
//   let throttledApp: INestApplication;

//   beforeAll(async () => {
//     // Override env to real limits for this suite only
//     process.env.THROTTLE_AUTH_LIMIT = '10'
//     process.env.THROTTLE_GLOBAL_LIMIT = '100'

//     const moduleRef = await Test.createTestingModule({
//       imports: [AppModule],
//     }).compile()

//     throttledApp = moduleRef.createNestApplication()
//     await throttledApp.init()
//   })

//   afterAll(async () => {
//     // Restore high limits so other suites are unaffected
//     process.env.THROTTLE_AUTH_LIMIT = '10000'
//     process.env.THROTTLE_GLOBAL_LIMIT = '10000'
//     await throttledApp.close()
//   })

//   it('POST /auth/login — returns 429 after exceeding rate limit', async () => {
//     const email = `throttle_login_${Date.now()}@test.com`

//     await Promise.all(
//       Array.from({ length: 10 }, () =>
//         request(throttledApp.getHttpServer())
//           .post('/auth/login')
//           .send({ email, password: 'password123' }),
//       ),
//     )

//     await request(throttledApp.getHttpServer())
//       .post('/auth/login')
//       .send({ email, password: 'password123' })
//       .expect(429)
//   })

//   it('POST /auth/signup — returns 429 after exceeding rate limit', async () => {
//     await Promise.all(
//       Array.from({ length: 10 }, (_, i) =>
//         request(throttledApp.getHttpServer())
//           .post('/auth/signup')
//           .send({
//             email: `throttle_signup_${Date.now()}_${i}@test.com`,
//             password: 'password123',
//             name: 'Tester',
//           }),
//       ),
//     )

//     await request(throttledApp.getHttpServer())
//       .post('/auth/signup')
//       .send({
//         email: `throttle_signup_last_${Date.now()}@test.com`,
//         password: 'password123',
//         name: 'Tester',
//       })
//       .expect(429)
//   })
// })