import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  // Create a new goal for a user
  create(userId: string, dto: CreateGoalDto) {
    return this.prisma.goal.create({
      data: {
        user_id: userId,
        title: dto.title,
        description: dto.description,
        deadline: new Date(dto.deadline),
        category: dto.category,
      },
    });
  }

  // Retrieve all goals for a specific user
  findAll(userId: string) {
    return this.prisma.goal.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  // Retrieve a specific goal by ID for a user
  async findOne(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        milestones: true,
        tasks: true,
      },
    });

    // Ensure the goal exists and belongs to the user
    if (!goal || goal.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return goal;
  }

  // Update a specific goal for a user
  async update(userId: string, goalId: string, dto: UpdateGoalDto) {

    // Verify the goal exists and belongs to the user
    await this.findOne(userId, goalId);

    // Update the goal with provided data
    return this.prisma.goal.update({
      where: { id: goalId },
      data: {
        ...dto,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined, // Convert deadline if provided, else leave unchanged
      },
    });
  }

  // Delete a specific goal for a user
  async delete(userId: string, goalId: string) {

    // Verify the goal exists and belongs to the user
    await this.findOne(userId, goalId);

    // Delete the goal
    return this.prisma.goal.delete({
      where: { id: goalId },
    });
  }

  // Stub for goal breakdown functionality
  async breakdownStub(userId: string, goalId: string) {

    // Verify the goal exists and belongs to the user
    await this.findOne(userId, goalId);

    // Placeholder for background LLM job
    return {
      message: 'Goal breakdown queued (stub)',
      goalId,
    };
  }
}
