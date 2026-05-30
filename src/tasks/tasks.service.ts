import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  assertValidTaskStatusTransition,
  assertTaskCanBeCompleted,
  assertValidDependency,
  assertNoDependencyCycle,
  assertDependencyWithinSameGoal,
  detectScheduleInvalidation,
  detectScheduleExecutionRisk,
  assertTaskDeletable,
} from './tasks.invariants';
import { TaskStatus } from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksRepository } from './tasks.repo';
import { EventLogService } from '../event-log/event-log.service';
import { handleInvariant } from '../common/errors/invariant-handler';
import { ScheduleBlocksQueryService } from '../scheduling/scheduling.query';

@Injectable()
export class TasksService {
  constructor(
    private readonly repo: TasksRepository,
    private readonly eventLog: EventLogService,
    private readonly scheduleBlocksQuery: ScheduleBlocksQueryService,
  ) {}

  // ─── Queries ───────────────────────────────────────────────────────────────

  // Get a task by ID and verify goal ownership — throws if not found or not owned
  async getById(userId: string, taskId: string) {
    const task = await this.repo.findById(taskId);
    if (!task) throw new NotFoundException();

    const ownsGoal = await this.repo.goalOwnedByUser(task.goal_id, userId);
    if (!ownsGoal) throw new ForbiddenException();

    return task;
  }

  // ─── Mutations ─────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateTaskDto) {
    const ownsGoal = await this.repo.goalOwnedByUser(dto.goal_id, userId);
    if (!ownsGoal) throw new ForbiddenException();

    const task = await this.repo.create(dto);

    await this.eventLog.log(userId, 'task.created', {
      task_id: task.id,
      goal_id: dto.goal_id,
    });

    return task;
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await this.getById(userId, taskId);

    // Prevent completion via PATCH — must use /complete endpoint
    if (dto.status === TaskStatus.done) {
      throw new BadRequestException(
        'Tasks must be completed using the complete endpoint',
      );
    }

    // Validate status transition if status is being updated
    if (dto.status && dto.status !== task.status) {
      try {
        assertValidTaskStatusTransition(task.status, dto.status);
      } catch (err) {
        handleInvariant(err);
      }
    }

    // Detect schedule impact and log events if schedule blocks exist
    const hasSchedules = await this.scheduleBlocksQuery.taskHasScheduleBlocks(task.id);

    if (hasSchedules) {
      if (detectScheduleInvalidation(task, dto)) {
        await this.eventLog.log(userId, 'task.schedule_invalidated', {
          task_id: task.id,
          changed_fields: Object.keys(dto),
        });
      }

      if (detectScheduleExecutionRisk(task, dto)) {
        await this.eventLog.log(userId, 'task.schedule_execution_risk', {
          task_id: task.id,
          changed_fields: Object.keys(dto),
        });
      }
    }

    const updated = await this.repo.update(taskId, dto);

    await this.eventLog.log(userId, 'task.updated', {
      task_id: taskId,
      changes: dto,
    });

    return updated;
  }

  async delete(userId: string, taskId: string) {
    const task = await this.getById(userId, taskId);

    const incompleteDependents = await this.repo.countIncompleteDependents(taskId);

    try {
      assertTaskDeletable(task.status, incompleteDependents);
    } catch (err) {
      handleInvariant(err);
    }

    // Delete dependencies first to maintain referential integrity
    await this.repo.deleteAllDependencies(taskId);
    await this.repo.softDelete(taskId);

    await this.eventLog.log(userId, 'task.deleted', {
      task_id: taskId,
    });
  }

  async complete(userId: string, taskId: string, actualMinutes: number) {
    const task = await this.getById(userId, taskId);

    const blockingDeps = await this.repo.findBlockingDependencies(taskId);

    try {
      assertTaskCanBeCompleted(task.status, blockingDeps.length, actualMinutes);
    } catch (err) {
      handleInvariant(err);
    }

    const completed = await this.repo.update(taskId, {
      status: TaskStatus.done,
      actual_minutes: actualMinutes,
    });

    await this.eventLog.log(userId, 'task.completed', {
      task_id: taskId,
      actual_minutes: actualMinutes,
    });

    return completed;
  }

  // ─── Dependencies ──────────────────────────────────────────────────────────

  async addDependency(userId: string, taskId: string, dependsOnTaskId: string) {
    try {
      assertValidDependency(taskId, dependsOnTaskId);
    } catch (err) {
      handleInvariant(err);
    }

    const task = await this.getById(userId, taskId);
    const dependencyTask = await this.getById(userId, dependsOnTaskId);

    try {
      assertDependencyWithinSameGoal(task.goal_id, dependencyTask.goal_id);
    } catch (err) {
      handleInvariant(err);
    }

    const transitiveDeps = await this.repo.findTransitiveDependencies(dependsOnTaskId);

    try {
      assertNoDependencyCycle(taskId, dependsOnTaskId, transitiveDeps);
    } catch (err) {
      handleInvariant(err);
    }

    const dep = await this.repo.addDependency(taskId, dependsOnTaskId);

    await this.eventLog.log(userId, 'task.dependency_added', {
      task_id: taskId,
      depends_on_task_id: dependsOnTaskId,
    });

    return dep;
  }

  async removeDependency(userId: string, taskId: string, dependsOnTaskId: string) {
    const task = await this.getById(userId, taskId);
    const dependencyTask = await this.getById(userId, dependsOnTaskId);

    try {
      assertDependencyWithinSameGoal(task.goal_id, dependencyTask.goal_id);
    } catch (err) {
      handleInvariant(err);
    }

    await this.repo.removeDependency(taskId, dependsOnTaskId);

    await this.eventLog.log(userId, 'task.dependency_removed', {
      task_id: taskId,
      depends_on_task_id: dependsOnTaskId,
    });
  }
}