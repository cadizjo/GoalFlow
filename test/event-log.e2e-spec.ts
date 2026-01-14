import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDb } from './utils/clean-db';

describe('EventLog (e2e)', () => {
  let app: INestApplication;
  let token: string;

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

    // signup
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'events@test.com',
        password: 'password123',
        name: 'Event Tester',
      });

    // login
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'events@test.com',
        password: 'password123',
      });

    token = res.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /events — returns user events', async () => {
    const res = await request(app.getHttpServer())
      .get('/events')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});
