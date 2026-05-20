import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDb } from './utils/cleanup';
import { signupAndLogin, authHeader } from './utils/helpers';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
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