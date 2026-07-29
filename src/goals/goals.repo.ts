import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Goal, GoalStatus, Prisma } from '@prisma/client'

@Injectable()
export class GoalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUnique(goalId: string): Promise<Goal | null> {
    return this.prisma.goal.findUnique({
      where: { id: goalId },
    })
  }

  async findUniqueWithRelations(goalId: string) {
    return this.prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        milestones: true,
        tasks: true,
      },
    })
  }

  async findManyByUser(
    userId: string,
    cursor?: string,
    limit: number = 20,
  ): Promise<Goal[]> {
    return this.prisma.goal.findMany({
      where: { user_id: userId, deleted_at: null },
      orderBy: { created_at: 'desc' },
      take: limit + 1, // fetch one extra to determine if there's a next page
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // skip the cursor item itself
      }),
    })
  }

  async create(userId: string, data: Prisma.GoalCreateInput): Promise<Goal> {
    return this.prisma.goal.create({
      data: { ...data, user: { connect: { id: userId } } },
    })
  }

  async update(goalId: string, data: Prisma.GoalUpdateInput): Promise<Goal> {
    return this.prisma.goal.update({
      where: { id: goalId },
      data,
    })
  }

  async softDelete(goalId: string): Promise<Goal> {
    return this.prisma.goal.update({
      where: { id: goalId },
      data: { deleted_at: new Date() },
    })
  }

  async countIncompleteTasks(goalId: string): Promise<number> {
    return this.prisma.task.count({
      where: {
        goal_id: goalId,
        status: { not: 'done' },
        deleted_at: null,
      },
    })
  }
}