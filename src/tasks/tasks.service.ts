import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TasksRepository } from './tasks.repo';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly repo: TasksRepository,
    private readonly eventLog: EventLogService,
  ) {}

  // Create a new task and verify goal ownership
  async create(userId: string, dto: CreateTaskDto) {
    const ownsGoal = await this.repo.goalOwnedByUser(dto.goal_id, userId);
    if (!ownsGoal) throw new ForbiddenException();

    const task = this.repo.create(dto);

    // Log the task creation event
    await this.eventLog.log(userId, 'task.created', {
      taskId: task.id,
      goalId: dto.goal_id,
    })

    return task;
  }

  // Get a task by ID and verify goal ownership
  async getById(userId: string, taskId: string) {
    const task = await this.repo.findById(taskId);
    if (!task) return null;

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

    // Validate status transition if status is being updated
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

    // Proceed with the update if all checks pass
    const updated = this.repo.update(taskId, dto);

    // Log the task update event
    await this.eventLog.log(userId, 'task.updated', {
      taskId,
      changes: dto,
    })

    return updated;
  }


  // Delete a task and its dependencies after verifying goal ownership
  async delete(userId: string, taskId: string) {
    const task = await this.getById(userId, taskId);
    if (!task) throw new NotFoundException();

    // First delete all dependencies related to the task to maintain data integrity
    await this.repo.deleteAllDependencies(taskId);
    return this.repo.delete(taskId);

    // Log the task deletion event
    await this.eventLog.log(userId, 'task.deleted', {
      taskId,
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
      status: 'done',
      actual_minutes: actualMinutes,
    })

    // Log the task completion event
    await this.eventLog.log(userId, 'task.completed', {
      taskId,
      actualMinutes,
    })

    return completed
  }

  // Add a dependency between two tasks after verifying ownership and validity
  async addDependency(
    userId: string,
    taskId: string,
    dependsOnTaskId: string,
  ) {

    // Validate that the dependency is valid
    try {
      assertValidDependency(taskId, dependsOnTaskId)
    } catch (err) {
      handleInvariant(err)
    }

    // Verify ownership of both tasks
    const task = await this.getById(userId, taskId)
    if (!task) throw new NotFoundException()

    const dependencyTask = await this.getById(userId, dependsOnTaskId)
    if (!dependencyTask) throw new NotFoundException()

    // Add the dependency
    const dep = await this.repo.addDependency(
      taskId,
      dependsOnTaskId,
    )

    // Log the dependency addition event
    await this.eventLog.log(userId, 'task.dependency_added', {
      taskId,
      dependsOnTaskId,
    })

    return dep
  }

  // Remove a dependency between two tasks after verifying ownership
  async removeDependency(
    userId: string,
    taskId: string,
    dependsOnTaskId: string,
  ) {

    // Verify ownership of the task
    const task = await this.getById(userId, taskId);
    if (!task) throw new NotFoundException();

    // Remove the dependency
    await this.repo.removeDependency(taskId, dependsOnTaskId)

    // Log the dependency removal event
    await this.eventLog.log(userId, 'task.dependency_removed', {
      taskId,
      dependsOnTaskId,
    })
  }
}
