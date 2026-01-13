import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  // Create a new task after verifying goal ownership
  async create(userId: string, dto: CreateTaskDto) {

    // Verify goal ownership
    const goal = await this.prisma.goal.findFirst({
      where: { id: dto.goal_id, user_id: userId },
    });

    if (!goal) throw new ForbiddenException();

    return this.prisma.task.create({
      data: dto,
    });
  }

  // Get task by ID with ownership check
  async getById(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        dependencies: true,
        dependents: true,
        subtasks: true,
      },
    });

    if (!task) return null;

    // Verify ownership via goal
    const ownsGoal = await this.prisma.goal.findFirst({
      where: { id: task.goal_id, user_id: userId },
    });

    if (!ownsGoal) throw new ForbiddenException();

    return task;
  }

  // Update task after verifying ownership
  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    await this.getById(userId, taskId);
    return this.prisma.task.update({
      where: { id: taskId },
      data: dto,
    });
  }

  // Delete task after verifying ownership
  async delete(userId: string, taskId: string) {
    await this.getById(userId, taskId);

    // Remove dependencies first to maintain referential integrity
    await this.prisma.taskDependency.deleteMany({
      where: {
        OR: [
          { task_id: taskId },
          { depends_on_task_id: taskId },
        ],
      },
    });

    return this.prisma.task.delete({
      where: { id: taskId },
    });
  }

  // Mark task as complete after verifying ownership and dependencies
  async complete(userId: string, taskId: string) {
    const task = await this.getById(userId, taskId);

    // Prevent completion if dependencies unfinished
    const blockingDeps = await this.prisma.taskDependency.findMany({
      where: {
        task_id: taskId,
        depends_on_task: {
          status: { not: 'done' },
        },
      },
    });

    if (blockingDeps.length > 0) {
      throw new BadRequestException('Task has unmet dependencies');
    }

    // Mark task as done if dependencies are satisfied
    return this.prisma.task.update({
      where: { id: taskId },
      data: { status: 'done' },
    });
  }

  // Add a dependency to a task after verifying ownership
  async addDependency(
    userId: string,
    taskId: string,
    dependsOnTaskId: string,
  ) {
    if (taskId === dependsOnTaskId) {
      throw new BadRequestException('Task cannot depend on itself');
    }

    // Verify ownership
    await this.getById(userId, taskId);
    await this.getById(userId, dependsOnTaskId);

    // NOTE: Cycle detection intentionally deferred
    return this.prisma.taskDependency.create({
      data: {
        task_id: taskId,
        depends_on_task_id: dependsOnTaskId,
      },
    });
  }

  // Remove a dependency from a task after verifying ownership
  async removeDependency(
    userId: string,
    taskId: string,
    dependsOnTaskId: string,
  ) {

    // Verify ownership
    await this.getById(userId, taskId);

    // Delete the dependency using composite key
    return this.prisma.taskDependency.delete({
      where: {
        task_id_depends_on_task_id: {
          task_id: taskId,
          depends_on_task_id: dependsOnTaskId,
        },
      },
    });
  }
}
