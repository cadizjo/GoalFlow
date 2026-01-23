// test/auth.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDb } from './utils/cleanup';

// End-to-end tests for Auth module
describe('Auth (e2e)', () => {
  let app: INestApplication;
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
      email: `auth_${Date.now()}@test.com`,
      password: 'password123',
      name: 'Auth Tester',
    };
  });

  // Close the NestJS application after all tests
  afterAll(async () => {
    await cleanDb(app);
    await app.close();
  });

  // Test user signup
  it('POST /auth/signup — should create user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(user)
      .expect(201);

    expect(res.body.access_token).toBeDefined();
  });

  // Test user login
  it('POST /auth/login — should login user', async () => {
    // Ensure user exists
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(user)
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(201);

    expect(res.body.access_token).toBeDefined();
  });

  // Test login with invalid password
  it('POST /auth/login — invalid password', async () => {
    // Ensure user exists
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(user)
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'wrongpassword'})
      .expect(401);
  });
});
