import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDb } from './utils/cleanup';
import { signupAndLogin, authHeader } from './utils/helpers';

describe('EventLog (e2e)', () => {
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
    token = await signupAndLogin(app, 'event');
  });

  afterAll(async () => {
    await cleanDb(app);
    await app.close();
  });

  it('GET /events — returns user events', async () => {
    const res = await request(app.getHttpServer())
      .get('/events')
      .set(authHeader(token))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    // Uncomment after events are emitted during signup & login:
    // expect(res.body.length).toBeGreaterThan(0);
    // expect(res.body[0]).toHaveProperty('type');
    // expect(res.body[0]).toHaveProperty('created_at');
  });
});