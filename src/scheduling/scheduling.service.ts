// src/scheduling/scheduling.service.ts
import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common'
import { ScheduleBlocksRepository } from './scheduling.repo'
import { TasksRepository } from '../tasks/tasks.repo'
import { EventLogService } from '../event-log/event-log.service'
import {
  assertValidTimeRange,
  assertNoScheduleOverlap,
  assertTaskCanBeScheduled,
  assertScheduleBlockIsMutable,
} from './scheduling.invariants'
import { handleInvariant } from '../common/errors/invariant-handler'
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto'
import { UpdateScheduleBlockDto } from './dto/update-schedule-block.dto'
import { ScheduleStatus } from '@prisma/client'

@Injectable()
export class ScheduleBlocksService {
  constructor(
    private readonly repo: ScheduleBlocksRepository,
    private readonly tasksRepo: TasksRepository,
    private readonly eventLog: EventLogService,
  ) {}

  // Create a new schedule block
  async create(userId: string, dto: CreateScheduleBlockDto) {

    // Convert start and end times to Date objects
    const start = new Date(dto.start_time)
    const end = new Date(dto.end_time)

    // 1. Validate time range
    try {
      assertValidTimeRange(start, end)
    } catch (err) {
      handleInvariant(err)
    }

    // 2. Get task
    const task = await this.tasksRepo.findById(dto.task_id)
    if (!task) throw new NotFoundException('Task not found')

    // 3. Verify task ownership
    const ownsTask = await this.tasksRepo.goalOwnedByUser(task.goal_id, userId)
    if (!ownsTask) throw new ForbiddenException()

    // 4. Validate task can be scheduled
    const incompleteDeps =
      await this.tasksRepo.findBlockingDependencies(task.id)

    try {
      assertTaskCanBeScheduled(task.status, incompleteDeps.length)
    } catch (err) {
      handleInvariant(err)
    }

    // 5. Validate no schedule overlap
    const overlapCount =
      await this.repo.countOverlaps(userId, start, end)

    try {
      assertNoScheduleOverlap(overlapCount)
    } catch (err) {
      handleInvariant(err)
    }

    // Create the schedule block
    const block = await this.repo.create(userId, dto)

    // Log the creation event
    await this.eventLog.log(userId, 'schedule.created', {
      schedule_block_id: block.id,
      task_id: task.id,
    })

    return block
  }

  // Retrieve all schedule blocks for a user
  async findAll(userId: string) {
    return await this.repo.findAllByUser(userId)
  }

  // Update an existing schedule block
  async update(
    userId: string, 
    id: string, 
    dto: UpdateScheduleBlockDto) 
  {

    // 1. Prevent completion via update
    if ((dto.status && dto.status === ScheduleStatus.completed) ||
        (dto.completed_at)) {
      throw new BadRequestException(
        'Schedule blocks must be completed using the complete endpoint',
      )
    }

    // 2. Fetch the existing block
    const block = await this.repo.findById(id)
    if (!block) throw new NotFoundException()
    if (block.user_id !== userId) throw new ForbiddenException()

    // 3. Validate mutability (not completed)
    try {
      assertScheduleBlockIsMutable(block.status)
    } catch (err) {
      handleInvariant(err)
    }

    // 4. If time range is changing, validate it
    if (dto.start_time || dto.end_time) {
      const start = dto.start_time ? new Date(dto.start_time) : block.start_time // if not provided, use existing
      const end = dto.end_time ? new Date(dto.end_time) : block.end_time // if not provided, use existing

      // 4a. Validate time range
      try {
        assertValidTimeRange(start, end)
      } catch (err) {
        handleInvariant(err)
      }

      // 4b. Count overlaps excluding current block
      const overlapCount =
        await this.repo.countOverlaps(
          userId,
          start,
          end,
          block.id,
        )

      // 4c. Validate no overlaps
      try {
        assertNoScheduleOverlap(overlapCount)
      } catch (err) {
        handleInvariant(err)
      }
    }

    // Perform the update
    const updatedBlock = await this.repo.update(id, dto)

    // Log the update event
    await this.eventLog.log(userId, 'schedule.updated', {
      schedule_block_id: id,
    })

    return updatedBlock
  }

  // Complete a schedule block
  async complete(userId: string, id: string) {

    // 1. Fetch block
    const block = await this.repo.findById(id)
    if (!block) throw new NotFoundException()
    if (block.user_id !== userId) throw new ForbiddenException()

    // 2. Validate mutability (not completed)
    try {
      assertScheduleBlockIsMutable(block.status)
    } catch (err) {
      handleInvariant(err)
    }

    // 3. Complete block
    const completedBlock = await this.repo.update(id, {
      status: ScheduleStatus.completed,
      completed_at: new Date().toISOString(),
    })

    // Optionally, you might want to update the associated task status here

    // 4. Emit event
    await this.eventLog.log(userId, 'schedule.completed', {
      schedule_block_id: id,
      task_id: block.task_id,
      completed_at: completedBlock.completed_at,
    })

    return completedBlock
  }

  // Delete a schedule block
  async delete(userId: string, id: string) {

    // 1. Fetch the existing block
    const block = await this.repo.findById(id)
    if (!block) throw new NotFoundException()
    if (block.user_id !== userId) throw new ForbiddenException()


    // 2. Validate mutability (not completed)
    try {
      assertScheduleBlockIsMutable(block.status)
    } catch (err) {
      handleInvariant(err)
    }

    // Perform the deletion
    const deletedBlock = await this.repo.delete(id)

    // Log the deletion event
    await this.eventLog.log(userId, 'schedule.deleted', {
      schedule_block_id: id,
    })

    return deletedBlock
  }
}
