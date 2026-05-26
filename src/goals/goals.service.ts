import {
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { GoalsRepository } from './goals.repo'
import { CreateGoalDto } from './dto/create-goal.dto'
import { UpdateGoalDto } from './dto/update-goal.dto'
import { EventLogService } from '../event-log/event-log.service'
import { handleInvariant } from '../common/errors/invariant-handler'
import {
  assertGoalOwnedByUser,
  assertGoalNotDeleted,
  assertGoalDeletable,
  assertValidGoalStatusTransition,
  assertDeadlineInFuture,
  assertDeadlineNotMovedBack,
  assertGoalTitleNotEmpty,
  assertGoalTitleLength,
} from './goals.invariants'

@Injectable()
export class GoalsService {
  constructor(
    private readonly repo: GoalsRepository,
    private readonly eventLog: EventLogService,
  ) {}

  // ─── Queries ───────────────────────────────────────────────────────────────

  async findAll(userId: string) {
    return this.repo.findManyByUser(userId)
  }

  async findOne(userId: string, goalId: string) {
    const goal = await this.repo.findUniqueWithRelations(goalId)
    if (!goal) throw new NotFoundException('Goal not found')

    try {
      assertGoalOwnedByUser(goal.user_id, userId)
      assertGoalNotDeleted(goal.deleted_at)
    } catch (err) {
      handleInvariant(err)
    }

    return goal
  }

  // ─── Mutations ─────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateGoalDto) {
    const deadline = new Date(dto.deadline)

    try {
      assertGoalTitleNotEmpty(dto.title)
      assertGoalTitleLength(dto.title)
      assertDeadlineInFuture(deadline)
    } catch (err) {
      handleInvariant(err)
    }

    const goal = await this.repo.create(userId, {
      title: dto.title,
      description: dto.description,
      deadline,
      category: dto.category,
    } as any)

    await this.eventLog.log(userId, 'goal.created', {
      goal_id: goal.id,
    })

    return goal
  }

  async update(userId: string, goalId: string, dto: UpdateGoalDto) {
    const goal = await this.repo.findUnique(goalId)
    if (!goal) throw new NotFoundException('Goal not found')

    try {
      assertGoalOwnedByUser(goal.user_id, userId)
      assertGoalNotDeleted(goal.deleted_at)
    } catch (err) {
      handleInvariant(err)
    }

    // Validate title if provided
    if (dto.title !== undefined) {
      try {
        assertGoalTitleNotEmpty(dto.title)
        assertGoalTitleLength(dto.title)
      } catch (err) {
        handleInvariant(err)
      }
    }

    // Validate status transition if provided
    if (dto.status !== undefined && dto.status !== goal.status) {
      try {
        assertValidGoalStatusTransition(goal.status, dto.status)
      } catch (err) {
        handleInvariant(err)
      }
    }

    // Validate deadline if provided
    if (dto.deadline !== undefined) {
      const newDeadline = new Date(dto.deadline)
      try {
        assertDeadlineNotMovedBack(goal.deadline, newDeadline)
      } catch (err) {
        handleInvariant(err)
      }
    }

    const updated = await this.repo.update(goalId, {
      ...dto,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
    })

    await this.eventLog.log(userId, 'goal.updated', {
      goal_id: goalId,
      changes: dto,
    })

    return updated
  }

  async delete(userId: string, goalId: string) {
    const goal = await this.repo.findUnique(goalId)
    if (!goal) throw new NotFoundException('Goal not found')

    try {
      assertGoalOwnedByUser(goal.user_id, userId)
      assertGoalNotDeleted(goal.deleted_at)
    } catch (err) {
      handleInvariant(err)
    }

    const incompleteTaskCount = await this.repo.countIncompleteTasks(goalId)
    try {
      assertGoalDeletable(goal.status, incompleteTaskCount)
    } catch (err) {
      handleInvariant(err)
    }

    await this.eventLog.log(userId, 'goal.deleted', {
      goal_id: goalId,
    })

    await this.repo.softDelete(goalId)
  }

  // ─── Breakdown stub ────────────────────────────────────────────────────────

  async breakdownStub(userId: string, goalId: string) {
    const goal = await this.repo.findUnique(goalId)
    if (!goal) throw new NotFoundException('Goal not found')

    try {
      assertGoalOwnedByUser(goal.user_id, userId)
      assertGoalNotDeleted(goal.deleted_at)
    } catch (err) {
      handleInvariant(err)
    }

    return {
      message: 'Goal breakdown queued (stub)',
      goalId,
    }
  }
}