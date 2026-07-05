import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { ScheduleBlocksRepository } from './scheduling.repo'
import { TasksRepository } from '../tasks/tasks.repo'
import { EventLogService } from '../event-log/event-log.service'
import {
  assertValidTimeRange,
  assertNoScheduleOverlap,
  assertTaskIsSchedulable,
  assertScheduleBlockIsMutable,
  assertTaskDependenciesComplete,
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

  // ─── Queries ───────────────────────────────────────────────────────────────

  findAll(userId: string) {
    return this.repo.findAllByUser(userId)
  }

  // ─── Mutations ─────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateScheduleBlockDto) {
    const start = new Date(dto.start_time)
    const end = new Date(dto.end_time)

    // Validate time range
    try {
      assertValidTimeRange(start, end)
    } catch (err) {
      handleInvariant(err)
    }

    // Verify task exists and is owned by the user
    const task = await this.tasksRepo.findById(dto.task_id)
    if (!task) throw new NotFoundException('Task not found')

    const ownsTask = await this.tasksRepo.goalOwnedByUser(task.goal_id, userId)
    if (!ownsTask) throw new ForbiddenException()

    // Validate task is schedulable
    try {
      assertTaskIsSchedulable(task.status)
    } catch (err) {
      handleInvariant(err)
    }

    // Validate no schedule overlap
    const overlapCount = await this.repo.countOverlaps(userId, start, end)
    try {
      assertNoScheduleOverlap(overlapCount)
    } catch (err) {
      handleInvariant(err)
    }

    const block = await this.repo.create(userId, dto)

    // Soft invariant — log a warning if task has unmet dependencies
    const incompleteDeps = await this.tasksRepo.findBlockingDependencies(task.id)
    if (incompleteDeps.length > 0) {
      await this.eventLog.log(userId, 'schedule.blocked_but_scheduled', {
        task_id: task.id,
        schedule_block_id: block.id,
        unmet_dependencies: incompleteDeps.map(d => d.depends_on_task_id),
      })
    }

    await this.eventLog.log(userId, 'schedule.created', {
      schedule_block_id: block.id,
      task_id: task.id,
    })

    return block
  }

  async update(userId: string, id: string, dto: UpdateScheduleBlockDto) {
    // Prevent completion via PATCH — must use /complete endpoint
    if (dto.status === ScheduleStatus.completed || dto.completed_at) {
      throw new BadRequestException(
        'Schedule blocks must be completed using the complete endpoint'
      )
    }

    const block = await this.repo.findById(id)
    if (!block) throw new NotFoundException()
    if (block.user_id !== userId) throw new ForbiddenException()

    try {
      assertScheduleBlockIsMutable(block.status)
    } catch (err) {
      handleInvariant(err)
    }

    // Validate new time range if either bound is changing
    if (dto.start_time || dto.end_time) {
      const start = dto.start_time ? new Date(dto.start_time) : block.start_time
      const end = dto.end_time ? new Date(dto.end_time) : block.end_time

      try {
        assertValidTimeRange(start, end)
      } catch (err) {
        handleInvariant(err)
      }

      const overlapCount = await this.repo.countOverlaps(userId, start, end, block.id)
      try {
        assertNoScheduleOverlap(overlapCount)
      } catch (err) {
        handleInvariant(err)
      }
    }

    const updated = await this.repo.update(id, dto)

    await this.eventLog.log(userId, 'schedule.updated', {
      schedule_block_id: id,
    })

    return updated
  }

  async complete(userId: string, id: string) {
    const block = await this.repo.findById(id)
    if (!block) throw new NotFoundException()
    if (block.user_id !== userId) throw new ForbiddenException()

    try {
      assertScheduleBlockIsMutable(block.status)
    } catch (err) {
      handleInvariant(err)
    }

    // Hard invariant — all task dependencies must be complete before marking done
    const incompleteDeps = await this.tasksRepo.findBlockingDependencies(block.task_id)
    try {
      assertTaskDependenciesComplete(incompleteDeps)
    } catch (err) {
      handleInvariant(err)
    }

    const completed = await this.repo.update(id, {
      status: ScheduleStatus.completed,
      completed_at: new Date().toISOString(),
    })

    await this.eventLog.log(userId, 'schedule.completed', {
      schedule_block_id: id,
      task_id: block.task_id,
      completed_at: completed.completed_at,
    })

    return completed
  }

  async delete(userId: string, id: string) {
    const block = await this.repo.findById(id)
    if (!block) throw new NotFoundException()
    if (block.user_id !== userId) throw new ForbiddenException()

    try {
      assertScheduleBlockIsMutable(block.status)
    } catch (err) {
      handleInvariant(err)
    }

    const deleted = await this.repo.delete(id)

    await this.eventLog.log(userId, 'schedule.deleted', {
      schedule_block_id: id,
    })

    return deleted
  }
}