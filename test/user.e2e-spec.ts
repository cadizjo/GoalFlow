// test/user.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDb } from './utils/cleanup';

// End-to-end tests for Users module
describe('Users (e2e)', () => {
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
      email: `users_${Date.now()}@test.com`,
      password: 'password123',
      name: 'Users Tester',
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

  // Test getting current user info without JWT
  it('GET /users/me — requires JWT', async () => {
    await request(app.getHttpServer())
      .get('/users/me')
      .expect(401);
  });

  // Test getting current user info with JWT
  it('GET /users/me — returns current user', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('email', user.email);
    expect(res.body).toHaveProperty('name', user.name);
  });

  // Test updating user profile
  it('PATCH /users/me — updates profile', async () => {
    const res = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Name',
        timezone: 'America/Los_Angeles',
      })
      .expect(200);

    expect(res.body.name).toBe('Updated Name');
    expect(res.body.timezone).toBe('America/Los_Angeles');
  });
});
