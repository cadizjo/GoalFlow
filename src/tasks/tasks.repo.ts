import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Task, TaskStatus } from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksRepository {
  constructor(private prisma: PrismaService) {}

  // ─── Tasks ─────────────────────────────────────────────────────────────────

  create(data: CreateTaskDto): Promise<Task> {
    return this.prisma.task.create({ data });
  }

  findById(taskId: string): Promise<Task | null> {
    return this.prisma.task.findFirst({
      where: {
        id: taskId,
        deleted_at: null,
      },
      include: {
        dependencies: true,
        dependents: true,
        subtasks: true,
      },
    });
  }

  findIncompleteByGoal(goalId: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        goal_id: goalId,
        status: { not: TaskStatus.done },
        deleted_at: null,
      },
    });
  }

  update(taskId: string, data: UpdateTaskDto): Promise<Task> {
    return this.prisma.task.update({
      where: { id: taskId },
      data,
    });
  }

  softDelete(taskId: string) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: { deleted_at: new Date() },
    });
  }

  // ─── Dependencies ──────────────────────────────────────────────────────────

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

  findBlockingDependencies(taskId: string) {
    return this.prisma.taskDependency.findMany({
      where: {
        task_id: taskId,
        depends_on_task: {
          deleted_at: null,
          status: { not: TaskStatus.done },
        },
      },
      include: { depends_on_task: true },
    });
  }

  addDependency(taskId: string, dependsOnTaskId: string) {
    return this.prisma.taskDependency.create({
      data: {
        task_id: taskId,
        depends_on_task_id: dependsOnTaskId,
      },
    });
  }

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

  async findTransitiveDependencies(taskId: string): Promise<string[]> {
    const visited = new Set<string>()
    const stack = [taskId]

    while (stack.length > 0) {
      const current = stack.pop()!

      const deps = await this.prisma.taskDependency.findMany({
        where: {
          task_id: current,
          depends_on_task: { deleted_at: null },
        },
        select: { depends_on_task_id: true },
      })

      for (const dep of deps) {
        if (!visited.has(dep.depends_on_task_id)) {
          visited.add(dep.depends_on_task_id)
          stack.push(dep.depends_on_task_id)
        }
      }
    }

    return Array.from(visited)
  }

  countIncompleteDependents(taskId: string): Promise<number> {
    return this.prisma.taskDependency.count({
      where: {
        depends_on_task_id: taskId,
        task: {
          deleted_at: null,
          status: { not: TaskStatus.done },
        },
      },
    });
  }

  // ─── Milestone association ─────────────────────────────────────────────────

  // Detach all active tasks from a milestone, returning them to the goal with no milestone
  detachFromMilestone(milestoneId: string) {
    return this.prisma.task.updateMany({
      where: { milestone_id: milestoneId, deleted_at: null },
      data: { milestone_id: null },
    })
  }

  // ─── Goal ownership ────────────────────────────────────────────────────────

  goalOwnedByUser(goalId: string, userId: string): Promise<boolean> {
    return this.prisma.goal
      .findFirst({
        where: { id: goalId, user_id: userId },
        select: { id: true },
      })
      .then(Boolean);
  }

  async findGoalById(goalId: string) {
    return this.prisma.goal.findUnique({
      where: { id: goalId },
      select: { id: true, deleted_at: true, status: true },
    })
  }
}