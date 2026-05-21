import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDb } from './utils/cleanup';
import { signupAndLogin, authHeader } from './utils/helpers';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await cleanDb(app);
    token = await signupAndLogin(app, 'users');
  });

  afterAll(async () => {
    await cleanDb(app);
    await app.close();
  });

  // ─── GET /users/me ─────────────────────────────────────────────────────────

  it('GET /users/me — requires JWT', async () => {
    await request(app.getHttpServer())
      .get('/users/me')
      .expect(401);
  });

  it('GET /users/me — returns current user without password_hash', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set(authHeader(token))
      .expect(200);

    expect(res.body.email).toContain('users_');
    expect(res.body).toHaveProperty('name');
    expect(res.body).not.toHaveProperty('password_hash');
  });

  // ─── PATCH /users/me ───────────────────────────────────────────────────────

  it('PATCH /users/me — updates name', async () => {
    const res = await request(app.getHttpServer())
      .patch('/users/me')
      .set(authHeader(token))
      .send({ name: 'Updated Name' })
      .expect(200);

    expect(res.body.name).toBe('Updated Name');
  });

  it('PATCH /users/me — updates email to a new valid address', async () => {
    const newEmail = `updated_${Date.now()}@test.com`;

    const res = await request(app.getHttpServer())
      .patch('/users/me')
      .set(authHeader(token))
      .send({ email: newEmail })
      .expect(200);

    expect(res.body.email).toBe(newEmail);
  });

  it('PATCH /users/me — rejects an empty body', async () => {
    await request(app.getHttpServer())
      .patch('/users/me')
      .set(authHeader(token))
      .send({})
      .expect(400);
  });

  it('PATCH /users/me — rejects an invalid email format', async () => {
    await request(app.getHttpServer())
      .patch('/users/me')
      .set(authHeader(token))
      .send({ email: 'not-an-email' })
      .expect(400);
  });

  it('PATCH /users/me — rejects an email already in use', async () => {
    // Create a second user to occupy the email
    const otherEmail = `other_${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: otherEmail, password: 'password123', name: 'Other' })
      .expect(201);

    await request(app.getHttpServer())
      .patch('/users/me')
      .set(authHeader(token))
      .send({ email: otherEmail })
      .expect(400);
  });

  it('PATCH /users/me — rejects a whitespace-only name', async () => {
    await request(app.getHttpServer())
      .patch('/users/me')
      .set(authHeader(token))
      .send({ name: '   ' })
      .expect(400);
  });

  it('PATCH /users/me — rejects a name exceeding 100 characters', async () => {
    await request(app.getHttpServer())
      .patch('/users/me')
      .set(authHeader(token))
      .send({ name: 'a'.repeat(101) })
      .expect(400);
  });

  it('PATCH /users/me — does not expose password_hash in response', async () => {
    const res = await request(app.getHttpServer())
      .patch('/users/me')
      .set(authHeader(token))
      .send({ name: 'Safe Update' })
      .expect(200);

    expect(res.body).not.toHaveProperty('password_hash');
  });

  // ─── PATCH /users/me/password ──────────────────────────────────────────────

  it('PATCH /users/me/password — updates password with valid credentials', async () => {
    await request(app.getHttpServer())
      .patch('/users/me/password')
      .set(authHeader(token))
      .send({ current_password: 'password123', new_password: 'newpassword456' })
      .expect(200);
  });

  it('PATCH /users/me/password — rejects incorrect current password', async () => {
    await request(app.getHttpServer())
      .patch('/users/me/password')
      .set(authHeader(token))
      .send({ current_password: 'wrongpassword', new_password: 'newpassword456' })
      .expect(401);
  });

  it('PATCH /users/me/password — rejects a weak new password', async () => {
    await request(app.getHttpServer())
      .patch('/users/me/password')
      .set(authHeader(token))
      .send({ current_password: 'password123', new_password: 'short' })
      .expect(400);
  });

  it('PATCH /users/me/password — rejects new password same as current', async () => {
    await request(app.getHttpServer())
      .patch('/users/me/password')
      .set(authHeader(token))
      .send({ current_password: 'password123', new_password: 'password123' })
      .expect(400);
  });

  it('PATCH /users/me/password — can login with new password after change', async () => {
    await request(app.getHttpServer())
      .patch('/users/me/password')
      .set(authHeader(token))
      .send({ current_password: 'password123', new_password: 'newpassword456' })
      .expect(200);

    // Extract email from GET /users/me to use in login
    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set(authHeader(token))
      .expect(200);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: me.body.email, password: 'newpassword456' })
      .expect(201);

    expect(res.body.access_token).toBeDefined();
  });

  // ─── DELETE /users/me ──────────────────────────────────────────────────────

  it('DELETE /users/me — soft deletes the current user', async () => {
    await request(app.getHttpServer())
      .delete('/users/me')
      .set(authHeader(token))
      .expect(200);

    // Account is deleted — further requests return 400 even with a valid token
    await request(app.getHttpServer())
      .get('/users/me')
      .set(authHeader(token))
      .expect(400);
  });

  it('DELETE /users/me — requires JWT', async () => {
    await request(app.getHttpServer())
      .delete('/users/me')
      .expect(401);
  });

  it('DELETE /users/me — prevents login after soft delete', async () => {
    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set(authHeader(token))
      .expect(200);

    await request(app.getHttpServer())
      .delete('/users/me')
      .set(authHeader(token))
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: me.body.email, password: 'password123' })
      .expect(401);
  });
});