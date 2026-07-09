import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Milestone } from '@prisma/client'
import { CreateMilestoneDto } from './dto/create-milestone.dto'
import { UpdateMilestoneDto } from './dto/update-milestone.dto'

type MilestoneWithGoal = Milestone & {
  goal: { user_id: string; deleted_at: Date | null; status: string }
}

@Injectable()
export class MilestonesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Milestones ────────────────────────────────────────────────────────────

  findById(milestoneId: string): Promise<MilestoneWithGoal | null> {
    return this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        goal: {
          select: { user_id: true, deleted_at: true, status: true },
        },
      },
    }) as Promise<MilestoneWithGoal | null>
  }

  findAllByGoal(goalId: string): Promise<Milestone[]> {
    return this.prisma.milestone.findMany({
      where: { goal_id: goalId, deleted_at: null },
      orderBy: { sequence: 'asc' },
    })
  }

  // Returns the next available sequence number after the current highest active sequence
  // Handles gaps caused by soft deletes — e.g. active sequences [0, 2] returns 3, not 2
  async nextSequence(goalId: string): Promise<number> {
    const last = await this.prisma.milestone.findFirst({
      where: { goal_id: goalId, deleted_at: null },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    })
    return last ? last.sequence + 1 : 0
  }

  create(goalId: string, data: CreateMilestoneDto & { sequence: number }): Promise<Milestone> {
    return this.prisma.milestone.create({
      data: {
        goal_id: goalId,
        title: data.title,
        sequence: data.sequence,
      },
    })
  }

  update(milestoneId: string, data: UpdateMilestoneDto): Promise<Milestone> {
    return this.prisma.milestone.update({
      where: { id: milestoneId },
      data,
    })
  }

  softDelete(milestoneId: string): Promise<Milestone> {
    return this.prisma.milestone.update({
      where: { id: milestoneId },
      data: { deleted_at: new Date() },
    })
  }

  sequenceExists(goalId: string, sequence: number, excludeId?: string): Promise<boolean> {
    return this.prisma.milestone
      .findFirst({
        where: {
          goal_id: goalId,
          sequence,
          deleted_at: null,
          id: excludeId ? { not: excludeId } : undefined,
        },
        select: { id: true },
      })
      .then(Boolean)
  }

  // ─── Goal lookups ──────────────────────────────────────────────────────────

  findGoalForUser(
    goalId: string,
    userId: string,
  ): Promise<{ id: string; deleted_at: Date | null; status: string } | null> {
    return this.prisma.goal.findFirst({
      where: { id: goalId, user_id: userId },
      select: { id: true, deleted_at: true, status: true },
    })
  }
}