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
import { ScheduleBlocksQueryService } from 'src/scheduling/scheduling.query';

@Injectable()
export class TasksService {
  constructor(
    private readonly repo: TasksRepository,
    private readonly eventLog: EventLogService,
    private readonly scheduleBlocksQuery: ScheduleBlocksQueryService,
  ) {}

  // Create a new task and verify goal ownership
  async create(userId: string, dto: CreateTaskDto) {
    const ownsGoal = await this.repo.goalOwnedByUser(dto.goal_id, userId);
    if (!ownsGoal) throw new ForbiddenException();

    const task = await this.repo.create(dto);

    // Log the task creation event
    await this.eventLog.log(userId, 'task.created', {
      task_id: task.id,
      goal_id: dto.goal_id,
    })

    return task;
  }

  // Get a task by ID and verify goal ownership
  async getById(userId: string, taskId: string) {
    const task = await this.repo.findById(taskId);
    if (!task) throw new NotFoundException();

    const ownsGoal = await this.repo.goalOwnedByUser(task.goal_id, userId);
    if (!ownsGoal) throw new ForbiddenException();

    return task;
  }

  // Update a task after verifying goal ownership and status transition validity
  async update(
    userId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ) {

    // Fetch the task to ensure it exists and is owned by the user
    const task = await this.getById(userId, taskId)
    if (!task) throw new NotFoundException()

    // 1. Prevent completion via update
    if (dto.status && dto.status === TaskStatus.done) {
      throw new BadRequestException(
        'Tasks must be completed using the complete endpoint',
      )
    }

    // 2. Validate status transition if status is being updated
    if (dto.status && dto.status !== task.status) {
      try {
        assertValidTaskStatusTransition(
          task.status,
          dto.status,
        )
      } catch (err) {
        handleInvariant(err)
      }
    }

    // 3. Schedule invalidation detection
    const hasSchedules = await this.scheduleBlocksQuery.taskHasScheduleBlocks(task.id)

    if (hasSchedules) {
      if (detectScheduleInvalidation(task, dto)) {
        await this.eventLog.log(userId, 'task.schedule_invalidated', {
          task_id: task.id,
          changed_fields: Object.keys(dto),
        })
      }

      if (detectScheduleExecutionRisk(task, dto)) {
        await this.eventLog.log(userId, 'task.schedule_execution_risk', {
          task_id: task.id,
          changed_fields: Object.keys(dto),
        })
      }
    }

    // Proceed with the update if all checks pass
    const updated = await this.repo.update(taskId, dto);

    // Log the task update event
    await this.eventLog.log(userId, 'task.updated', {
      task_id: taskId,
      changes: dto,
    })

    return updated;
  }


  // Delete a task and its dependencies after verifying goal ownership
  async delete(userId: string, taskId: string) {
    const task = await this.getById(userId, taskId);
    if (!task) throw new NotFoundException();

    const incompleteDependents = await this.repo.countIncompleteDependents(taskId);
    
    // Validate that the task can be deleted
    try {
      assertTaskDeletable(task.status, incompleteDependents)
    } catch (err) {
      handleInvariant(err)
    }

    // First delete all dependencies related to the task to maintain data integrity
    await this.repo.deleteAllDependencies(taskId);
    await this.repo.delete(taskId);

    // Log the task deletion event
    await this.eventLog.log(userId, 'task.deleted', {
      task_id: taskId,
    })
  }

  // Complete a task after verifying all invariants
  async complete(
    userId: string,
    taskId: string,
    actualMinutes: number, // actualMinutes is required to complete a task
  ) {

    // Fetch the task to ensure it exists and is owned by the user
    const task = await this.getById(userId, taskId)
    if (!task) throw new NotFoundException()

    // Check for blocking dependencies
    const blockingDeps = await this.repo.findBlockingDependencies(taskId)

    // Validate completion invariants
    try {
      assertTaskCanBeCompleted(
        task.status,
        blockingDeps.length,
        actualMinutes,
      )
    } catch (err) {
      handleInvariant(err)
    }

    // Mark the task as completed
    const completed = await this.repo.update(taskId, {
      status: TaskStatus.done,
      actual_minutes: actualMinutes,
    })

    // Log the task completion event
    await this.eventLog.log(userId, 'task.completed', {
      task_id: taskId,
      actual_minutes: actualMinutes,
    })

    return completed
  }

  // Add a dependency between two tasks after verifying ownership and validity
  async addDependency(
    userId: string,
    taskId: string,
    dependsOnTaskId: string,
  ) {

    // 1. Validate that the dependency is valid (i.e., not self-dependency)
    try {
      assertValidDependency(taskId, dependsOnTaskId)
    } catch (err) {
      handleInvariant(err)
    }

    // 2. Verify ownership of both tasks
    const task = await this.getById(userId, taskId)
    if (!task) throw new NotFoundException()

    const dependencyTask = await this.getById(userId, dependsOnTaskId)
    if (!dependencyTask) throw new NotFoundException()

    // 3. Verify that both tasks belong to the same goal
    try {
      assertDependencyWithinSameGoal(
        task.goal_id,
        dependencyTask.goal_id,
      )
    } catch (err) {
      handleInvariant(err)
    }

    // 4. Cycle detection - ensure adding this dependency won't create a cycle
    const transitiveDeps = await this.repo.findTransitiveDependencies(dependsOnTaskId)

    try {
      assertNoDependencyCycle(
        taskId,
        dependsOnTaskId,
        transitiveDeps,
      )
    } catch (err) {
      handleInvariant(err)
    }

    // Add the dependency
    const dep = await this.repo.addDependency(
      taskId,
      dependsOnTaskId,
    )

    // Log the dependency addition event
    await this.eventLog.log(userId, 'task.dependency_added', {
      task_id: taskId,
      depends_on_task_id: dependsOnTaskId,
    })

    return dep
  }

  // Remove a dependency between two tasks after verifying ownership
  async removeDependency(
    userId: string,
    taskId: string,
    dependsOnTaskId: string,
  ) {

    // Verify ownership of both tasks
    const task = await this.getById(userId, taskId)
    if (!task) throw new NotFoundException()

    const dependencyTask = await this.getById(userId, dependsOnTaskId)
    if (!dependencyTask) throw new NotFoundException()

    // Verify that both tasks belong to the same goal
    try {
      assertDependencyWithinSameGoal(
        task.goal_id,
        dependencyTask.goal_id,
      )
    } catch (err) {
      handleInvariant(err)
    }

    // Remove the dependency
    await this.repo.removeDependency(taskId, dependsOnTaskId)

    // Log the dependency removal event
    await this.eventLog.log(userId, 'task.dependency_removed', {
      task_id: taskId,
      depends_on_task_id: dependsOnTaskId,
    })
  }
}
