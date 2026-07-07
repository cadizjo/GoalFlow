import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
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
import { assertGoalIsActive } from '../goals/goals.invariants';
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

  // ─── Helpers ───────────────────────────────────────────────────────────────

  // Fetch the goal and assert it is still active (not deleted or completed)
  private async assertGoalActive(goalId: string) {
    const goal = await this.repo.findGoalById(goalId)
    if (!goal) throw new NotFoundException('Goal not found')
    try {
      assertGoalIsActive(goal.deleted_at, goal.status as any)
    } catch (err) {
      handleInvariant(err)
    }
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

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

    await this.assertGoalActive(dto.goal_id);

    const task = await this.repo.create(dto);

    await this.eventLog.log(userId, 'task.created', {
      task_id: task.id,
      goal_id: dto.goal_id,
    });

    return task;
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await this.getById(userId, taskId);

    await this.assertGoalActive(task.goal_id);

    if (dto.status === TaskStatus.done) {
      throw new BadRequestException(
        'Tasks must be completed using the complete endpoint',
      );
    }

    if (dto.status && dto.status !== task.status) {
      try {
        assertValidTaskStatusTransition(task.status, dto.status);
      } catch (err) {
        handleInvariant(err);
      }
    }

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

    await this.assertGoalActive(task.goal_id);

    const incompleteDependents = await this.repo.countIncompleteDependents(taskId);

    try {
      assertTaskDeletable(task.status, incompleteDependents);
    } catch (err) {
      handleInvariant(err);
    }

    await this.repo.deleteAllDependencies(taskId);
    await this.repo.softDelete(taskId);

    await this.eventLog.log(userId, 'task.deleted', {
      task_id: taskId,
    });
  }

  async complete(userId: string, taskId: string, actualMinutes: number) {
    const task = await this.getById(userId, taskId);

    await this.assertGoalActive(task.goal_id);

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

    // Both tasks share the same goal (enforced below), so one active check suffices
    await this.assertGoalActive(task.goal_id);

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

    await this.assertGoalActive(task.goal_id);

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