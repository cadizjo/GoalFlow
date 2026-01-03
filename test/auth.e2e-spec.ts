import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// End-to-end tests for Auth module
describe('Auth (e2e)', () => {
  let app: INestApplication;

  // Initialize the NestJS application before all tests
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  // Close the NestJS application after all tests
  afterAll(async () => {
    await app.close();
  });

  // Test user data
  const user = {
    email: 'auth@test.com',
    password: 'password123',
    name: 'Auth Tester',
  };

  // Test user signup
  it('POST /auth/signup — should create user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(user)
      .expect(201);

    expect(res.body).toHaveProperty('access_token');
  });

  // Test user login
  it('POST /auth/login — should login user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: user.email,
        password: user.password,
      })
      .expect(201);

    expect(res.body).toHaveProperty('access_token');
  });

  // Test login with invalid password
  it('POST /auth/login — invalid password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: user.email,
        password: 'wrongpassword',
      })
      .expect(401);
  });
});
