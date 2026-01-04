import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';

@Injectable()
export class MilestonesService {
  constructor(private prisma: PrismaService) {}

  // Create a new milestone under a specific goal for a user
  async create(
    userId: string,
    goalId: string,
    dto: CreateMilestoneDto,
  ) {
    // Ensure goal belongs to user
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, user_id: userId },
    });

    if (!goal) {
      throw new ForbiddenException('Goal not found or access denied');
    }

    // Auto-assign sequence if not provided
    const sequence =
      dto.sequence ?? // if sequence not provided
      (await this.prisma.milestone.count({ where: { goal_id: goalId } })); // count existing milestones

    return this.prisma.milestone.create({
      data: {
        goal_id: goalId,
        title: dto.title,
        sequence,
      },
    });
  }

  // Retrieve all milestones for a specific goal and user
  async findAllForGoal(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, user_id: userId },
    });

    if (!goal) {
      throw new ForbiddenException('Goal not found or access denied');
    }

    return this.prisma.milestone.findMany({
      where: { goal_id: goalId },
      orderBy: { sequence: 'asc' },
    });
  }

  // Update a specific milestone for a user
  async update(userId: string, milestoneId: string, dto: UpdateMilestoneDto) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { goal: true },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.goal.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.milestone.update({
      where: { id: milestoneId },
      data: dto,
    });
  }

  // Delete a specific milestone for a user
  async remove(userId: string, milestoneId: string) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { goal: true },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.goal.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.milestone.delete({
      where: { id: milestoneId },
    });
  }
}
