import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Task } from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

// Repository for task-related database operations
@Injectable()
export class TasksRepository {
  constructor(private prisma: PrismaService) {}

  // Create a new task
  create(data: CreateTaskDto): Promise<Task> {
    return this.prisma.task.create({ data });
  }

  // Find a task by its ID
  findById(taskId: string) {
    return this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        dependencies: true,
        dependents: true,
        subtasks: true,
      },
    });
  }

  // Update an existing task
  update(taskId: string, data: UpdateTaskDto): Promise<Task> {
    return this.prisma.task.update({
      where: { id: taskId },
      data,
    });
  }

  // Delete a task by its ID
  delete(taskId: string): Promise<Task> {
    return this.prisma.task.delete({
      where: { id: taskId },
    });
  }

  // Delete all dependencies related to a task
  deleteAllDependencies(taskId: string) {
    return this.prisma.taskDependency.deleteMany({
      where: {
        OR: [
          { task_id: taskId },
          { depends_on_task_id: taskId },
        ],
      },
    });
  }

  // Find dependencies that are blocking the completion of a task
  findBlockingDependencies(taskId: string) {
    return this.prisma.taskDependency.findMany({
      where: {
        task_id: taskId,
        depends_on_task: {
          status: { not: 'done' },
        },
      },
      include: {
        depends_on_task: true,
      },
    });
  }

  // Add a dependency between two tasks
  addDependency(taskId: string, dependsOnTaskId: string) {
    return this.prisma.taskDependency.create({
      data: {
        task_id: taskId,
        depends_on_task_id: dependsOnTaskId,
      },
    });
  }

  // Remove a dependency between two tasks
  removeDependency(taskId: string, dependsOnTaskId: string) {
    return this.prisma.taskDependency.delete({
      where: {
        task_id_depends_on_task_id: {
          task_id: taskId,
          depends_on_task_id: dependsOnTaskId,
        },
      },
    });
  }

  // Check if a goal is owned by a specific user
  goalOwnedByUser(goalId: string, userId: string): Promise<boolean> {
    return this.prisma.goal
      .findFirst({
        where: { id: goalId, user_id: userId },
        select: { id: true }, // Only select the ID for efficiency
      })
      .then(Boolean); // Convert result to boolean
  }
}
