import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { MilestonesRepository } from './milestones.repo'
import { CreateMilestoneDto } from './dto/create-milestone.dto'
import { UpdateMilestoneDto } from './dto/update-milestone.dto'
import { EventLogService } from '../event-log/event-log.service'
import { handleInvariant } from '../common/errors/invariant-handler'
import { assertGoalIsActive } from '../goals/goals.invariants'
import {
  assertMilestoneTitleNotEmpty,
  assertMilestoneTitleLength,
  assertSequenceNotTaken,
} from './milestones.invariants'

@Injectable()
export class MilestonesService {
  constructor(
    private readonly repo: MilestonesRepository,
    private readonly eventLog: EventLogService,
  ) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async getMilestone(userId: string, milestoneId: string) {
    const milestone = await this.repo.findById(milestoneId)
    if (!milestone) throw new NotFoundException('Milestone not found')
    if (milestone.goal.user_id !== userId) throw new ForbiddenException()
    return milestone
  }

  private async getActiveGoalForUser(goalId: string, userId: string) {
    const goal = await this.repo.findGoalForUser(goalId, userId)
    if (!goal) throw new ForbiddenException()

    try {
      assertGoalIsActive(goal.deleted_at, goal.status as any)
    } catch (err) {
      handleInvariant(err)
    }

    return goal
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  async findAllForGoal(userId: string, goalId: string) {
    await this.getActiveGoalForUser(goalId, userId)
    return this.repo.findAllByGoal(goalId)
  }

  // ─── Mutations ─────────────────────────────────────────────────────────────

  async create(userId: string, goalId: string, dto: CreateMilestoneDto) {
    await this.getActiveGoalForUser(goalId, userId)

    try {
      assertMilestoneTitleNotEmpty(dto.title)
      assertMilestoneTitleLength(dto.title)
    } catch (err) {
      handleInvariant(err)
    }

    // Auto-assign next sequence after the current highest — handles gaps from soft deletes
    const sequence = dto.sequence ?? await this.repo.nextSequence(goalId)

    const isTaken = await this.repo.sequenceExists(goalId, sequence)
    try {
      assertSequenceNotTaken(isTaken)
    } catch (err) {
      handleInvariant(err)
    }

    const milestone = await this.repo.create(goalId, { ...dto, sequence })

    await this.eventLog.log(userId, 'milestone.created', {
      milestone_id: milestone.id,
      goal_id: goalId,
      sequence,
    })

    return milestone
  }

  async update(userId: string, milestoneId: string, dto: UpdateMilestoneDto) {
    const milestone = await this.getMilestone(userId, milestoneId)

    try {
      assertGoalIsActive(milestone.goal.deleted_at, milestone.goal.status as any)
    } catch (err) {
      handleInvariant(err)
    }

    if (dto.title !== undefined) {
      try {
        assertMilestoneTitleNotEmpty(dto.title)
        assertMilestoneTitleLength(dto.title)
      } catch (err) {
        handleInvariant(err)
      }
    }

    if (dto.sequence !== undefined) {
      const isTaken = await this.repo.sequenceExists(milestone.goal_id, dto.sequence, milestoneId)
      try {
        assertSequenceNotTaken(isTaken)
      } catch (err) {
        handleInvariant(err)
      }
    }

    const updated = await this.repo.update(milestoneId, dto)

    await this.eventLog.log(userId, 'milestone.updated', {
      milestone_id: milestoneId,
      changes: dto,
    })

    return updated
  }

  async remove(userId: string, milestoneId: string) {
    const milestone = await this.getMilestone(userId, milestoneId)

    try {
      assertGoalIsActive(milestone.goal.deleted_at, milestone.goal.status as any)
    } catch (err) {
      handleInvariant(err)
    }

    await this.repo.softDelete(milestoneId)

    await this.eventLog.log(userId, 'milestone.deleted', {
      milestone_id: milestoneId,
      goal_id: milestone.goal_id,
      user_id: userId,
      reason: 'milestone_delete',
    })
  }
}