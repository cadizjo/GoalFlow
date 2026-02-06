import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { cleanDb } from './utils/cleanup'

describe('ScheduleBlocks (e2e)', () => {
  let app: INestApplication
  let token: string
  let goalId: string
  let taskId: string

  const auth = () => ({
    Authorization: `Bearer ${token}`,
  })

  const start = new Date('2030-01-01T10:00:00Z') // 10:00 AM
  const end = new Date('2030-01-01T10:30:00Z') // 10:30 AM

  /* ------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------ */

  const signupAndLogin = async () => {
    const email = `schedule_${Date.now()}@test.com`

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password: 'password123', name: 'Scheduler' })
      .expect(201)

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'password123' })
      .expect(201)

    token = login.body.access_token
  }

  const createGoal = async () => {
    const res = await request(app.getHttpServer())
      .post('/goals')
      .set(auth())
      .send({
        title: `Goal ${Date.now()}`,
        deadline: new Date().toISOString(),
      })
      .expect(201)

    return res.body
  }

  const createTask = async (
    overrides: Partial<any> = {},
    overrideGoalId?: string,
  ) => {
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set(auth())
      .send({
        goal_id: overrideGoalId ?? goalId,
        description: 'Scheduled Task',
        estimated_minutes: 30,
        priority_score: 1,
        ...overrides,
      })
      .expect(201)

    return res.body
  }

  const createScheduleBlock = (
    overrides: Partial<any> = {},
  ) =>
    request(app.getHttpServer())
      .post('/schedule-blocks')
      .set(auth())
      .send({
        task_id: taskId,
        start_time: start,
        end_time: end,
        source: 'manual',
        ...overrides,
      })

  const completeScheduleBlock = (id: string) =>
    request(app.getHttpServer())
      .post(`/schedule-blocks/${id}/complete`)
      .set(auth())

  /* ------------------------------------------------------------------
   * Setup / Teardown
   * ------------------------------------------------------------------ */

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()
  })

  beforeEach(async () => {
    await cleanDb(app)
    await signupAndLogin()

    const goal = await createGoal()
    goalId = goal.id

    const task = await createTask()
    taskId = task.id
  })

  afterAll(async () => {
    await cleanDb(app)
    await app.close()
  })

  /* ------------------------------------------------------------------
   * Core CRUD
   * ------------------------------------------------------------------ */

  it('creates a schedule block', async () => {
    const res = await createScheduleBlock().expect(201)

    expect(res.body.task_id).toBe(taskId)
    expect(res.body.status).toBe('scheduled')
  })

  it('lists only user schedule blocks', async () => {
    await createScheduleBlock().expect(201)

    const res = await request(app.getHttpServer())
      .get('/schedule-blocks')
      .set(auth())
      .expect(200)

    expect(res.body.length).toBe(1)
  })

  it('updates a schedule block', async () => {
    const createRes = await createScheduleBlock().expect(201)
    const blockId = createRes.body.id

    const res = await request(app.getHttpServer())
      .patch(`/schedule-blocks/${blockId}`)
      .set(auth())
      .send({
        end_time: new Date('2030-01-01T11:00:00Z'),
      })
      .expect(200)

    expect(res.body.end_time).toBe('2030-01-01T11:00:00.000Z')
  })

  it('deletes a schedule block', async () => {
    const createRes = await createScheduleBlock().expect(201)

    await request(app.getHttpServer())
      .delete(`/schedule-blocks/${createRes.body.id}`)
      .set(auth())
      .expect(200)

    const res = await request(app.getHttpServer())
      .get('/schedule-blocks')
      .set(auth())
      .expect(200)

    expect(res.body.length).toBe(0)
  })

  /* ------------------------------------------------------------------
   * Scheduling Invariant Tests
   * ------------------------------------------------------------------ */

  it('rejects overlapping schedule blocks', async () => {
    await createScheduleBlock().expect(201)

    await createScheduleBlock({
      start_time: new Date('2030-01-01T10:15:00Z'), // 10:15 AM
      end_time: new Date('2030-01-01T10:45:00Z'), // 10:45 AM
    }).expect(400)
  })

  it('rejects scheduling a completed task', async () => {
    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/complete`)
      .set(auth())
      .send({ actual_minutes: 30 })
      .expect(201)

    await createScheduleBlock().expect(400)
  })

  it('rejects invalid time ranges', async () => {
    await createScheduleBlock({
      start_time: end,
      end_time: start,
    }).expect(400)
  })

  it('prevents updating a completed schedule block', async () => {
    const createRes = await createScheduleBlock().expect(201)
    const blockId = createRes.body.id

    await completeScheduleBlock(blockId).expect(201)

    await request(app.getHttpServer())
      .patch(`/schedule-blocks/${blockId}`)
      .set(auth())
      .send({ end_time: new Date('2030-01-01T12:00:00Z') })
      .expect(400)
  })

  /* ------------------------------------------------------------------
   * Cross-module Invariant Tests
   * ------------------------------------------------------------------ */

  it('blocks schedule completion if task dependencies are incomplete', async () => {

    // Create and add dependency 
    const dep = await createTask({ description: 'Dependency' })

    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/dependencies`)
      .set(auth())
      .send({ depends_on_task_id: dep.id })
      .expect(201)

    // Create schedule block for the blocked task
    const block = await createScheduleBlock().expect(201)

    // Attempt to complete the schedule block
    await completeScheduleBlock(block.body.id).expect(400)
  })

  it('allows scheduling with unmet dependencies but logs event', async () => {

    // Create and add dependency
    const dep = await createTask()

    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/dependencies`)
      .set(auth())
      .send({ depends_on_task_id: dep.id })
      .expect(201)

    // Scheduling allowed for the blocked task (soft invariant)
    await createScheduleBlock().expect(201)
  })

  it('deletes future schedule blocks when task is deleted', async () => {

    // Create schedule block for the task
    const block = await createScheduleBlock().expect(201)

    // Delete the task
    await request(app.getHttpServer())
      .delete(`/tasks/${taskId}`)
      .set(auth())
      .expect(200)
      
    // Ensure the schedule block is also deleted
    const res = await request(app.getHttpServer())
      .get('/schedule-blocks')
      .set(auth())
      .expect(200)

    expect(res.body.find(b => b.id === block.body.id)).toBeUndefined()
  })

})