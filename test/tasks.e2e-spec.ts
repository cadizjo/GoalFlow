import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDb } from './utils/cleanup';

describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let goalId: string;

  /* ------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------ */

  const auth = () =>
    ({ Authorization: `Bearer ${token}` });

  const createUserAndLogin = async () => {
    const email = `tasks_${Date.now()}@test.com`;

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password: 'password123', name: 'Tester' })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'password123' })
      .expect(201);

    token = login.body.access_token;
  };

  const createGoal = async () => {
    const res = await request(app.getHttpServer())
      .post('/goals')
      .set(auth())
      .send({
        title: `Test Goal ${Date.now()}`,
        deadline: new Date().toISOString(),
      })
      .expect(201);

    return res.body;
  };

  const createTask = async (
    overrides: Partial<any> = {},
    overrideGoalId?: string,
  ) => {
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set(auth())
      .send({
        goal_id: overrideGoalId ?? goalId, // use existing goalId by default
        description: 'Task',
        estimated_minutes: 30,
        priority_score: 1,
        ...overrides,
      })
      .expect(201);

    return res.body;
  };

  const addDependency = (taskId: string, dependsOnId: string) =>
    request(app.getHttpServer())
      .post(`/tasks/${taskId}/dependencies`)
      .set(auth())
      .send({ depends_on_task_id: dependsOnId });

  const completeTask = (taskId: string, minutes = 10) =>
    request(app.getHttpServer())
      .post(`/tasks/${taskId}/complete`)
      .set(auth())
      .send({ actual_minutes: minutes });

  /* ------------------------------------------------------------------
   * Setup / Teardown
   * ------------------------------------------------------------------ */

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await cleanDb(app);
    await createUserAndLogin();
    const goal = await createGoal();
    goalId = goal.id;
  });

  afterAll(async () => {
    await cleanDb(app);
    await app.close();
  });

  /* ------------------------------------------------------------------
   * Core CRUD
   * ------------------------------------------------------------------ */

  it('creates and fetches a task', async () => {
    const task = await createTask({ description: 'Fetch me' });

    const res = await request(app.getHttpServer())
      .get(`/tasks/${task.id}`)
      .set(auth())
      .expect(200);

    expect(res.body.description).toBe('Fetch me');
  });

  it('updates task fields (non-status)', async () => {
    const task = await createTask();

    const res = await request(app.getHttpServer())
      .patch(`/tasks/${task.id}`)
      .set(auth())
      .send({ description: 'Updated' })
      .expect(200);

    expect(res.body.description).toBe('Updated');
  });

  /* ------------------------------------------------------------------
   * Status invariants
   * ------------------------------------------------------------------ */

  it('rejects completing via PATCH (must use /complete)', async () => {
    const task = await createTask();

    await request(app.getHttpServer())
      .patch(`/tasks/${task.id}`)
      .set(auth())
      .send({ status: 'done' })
      .expect(400);
  });

  it('enforces valid status transitions', async () => {
    const task = await createTask();

    // todo → blocked is invalid
    await request(app.getHttpServer())
      .patch(`/tasks/${task.id}`)
      .set(auth())
      .send({ status: 'blocked' })
      .expect(400);
  });

  /* ------------------------------------------------------------------
   * Completion invariants
   * ------------------------------------------------------------------ */

  it('blocks completion when dependencies are incomplete', async () => {
    const dep = await createTask({ description: 'Dependency' });
    const task = await createTask({ description: 'Blocked' });

    await addDependency(task.id, dep.id).expect(201);

    await completeTask(task.id).expect(400);
  });

  it('allows completion after dependencies complete', async () => {
    const dep = await createTask();
    const task = await createTask();

    await addDependency(task.id, dep.id).expect(201);
    await completeTask(dep.id).expect(201);

    const res = await completeTask(task.id, 50).expect(201);
    expect(res.body.status).toBe('done');
  });

  it('rejects completion without actual minutes', async () => {
    const task = await createTask();

    await request(app.getHttpServer())
      .post(`/tasks/${task.id}/complete`)
      .set(auth())
      .send({})
      .expect(400);
  });

  /* ------------------------------------------------------------------
   * Dependency invariants
   * ------------------------------------------------------------------ */

  it('rejects self-dependency', async () => {
    const task = await createTask();

    await addDependency(task.id, task.id).expect(400);
  });

  it('rejects cross-goal dependencies', async () => {
    const goalA = await createGoal();
    const goalB = await createGoal();

    const taskInGoalA = await createTask(
      { description: 'Task in Goal A' },
      goalA.id,
    );

    const taskInGoalB = await createTask(
      { description: 'Task in Goal B' },
      goalB.id,
    );

    await addDependency(taskInGoalA.id, taskInGoalB.id)
      .expect(400);
  });

  it('rejects circular dependencies', async () => {
    const a = await createTask({ description: 'A' });
    const b = await createTask({ description: 'B' });
    const c = await createTask({ description: 'C' });

    await addDependency(b.id, a.id).expect(201);
    await addDependency(c.id, b.id).expect(201);

    // A → C creates a cycle
    await addDependency(a.id, c.id).expect(400);
  });

  it('allows dependency removal and then completion', async () => {
    const dep = await createTask();
    const task = await createTask();

    await addDependency(task.id, dep.id).expect(201);
    await completeTask(task.id).expect(400);

    await request(app.getHttpServer())
      .delete(`/tasks/${task.id}/dependencies/${dep.id}`)
      .set(auth())
      .expect(200);

    await completeTask(task.id).expect(201);
  });

  /* ------------------------------------------------------------------
   * Deletion invariants
   * ------------------------------------------------------------------ */

  it('blocks deletion when dependents are incomplete', async () => {
    const parent = await createTask();
    const child = await createTask();

    await addDependency(child.id, parent.id).expect(201);

    await request(app.getHttpServer())
      .delete(`/tasks/${parent.id}`)
      .set(auth())
      .expect(400);
  });

  it('deletes task when deletable', async () => {
    const task = await createTask();

    await request(app.getHttpServer())
      .delete(`/tasks/${task.id}`)
      .set(auth())
      .expect(200);

    await request(app.getHttpServer())
      .get(`/tasks/${task.id}`)
      .set(auth())
      .expect(404);
  });
});
