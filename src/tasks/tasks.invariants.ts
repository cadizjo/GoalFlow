import { Task, TaskStatus } from '@prisma/client'
import { InvariantViolation } from '../common/errors/invariant-violation'

/**
 * Task completion invariants
 */
export function assertTaskCanBeCompleted(
  taskStatus: TaskStatus,
  incompleteDependencyCount: number,
  actualMinutes?: number
) {
  if (taskStatus === TaskStatus.done) {
    throw new InvariantViolation('Task is already completed')
  }

  if (incompleteDependencyCount > 0) {
    throw new InvariantViolation(
      'Task cannot be completed until all dependencies are done'
    )
  }

  if (!actualMinutes || actualMinutes <= 0) {
    throw new InvariantViolation(
      'Actual minutes must be provided to complete a task'
    )
  }
}

/**
 * Task deletion invariants
 */
export function assertTaskDeletable(
  taskStatus: TaskStatus,
  incompleteDependentsCount: number,
) {
  if (taskStatus === TaskStatus.done) {
    throw new InvariantViolation("Completed tasks cannot be deleted")
  }
  
  if (incompleteDependentsCount > 0) {
    throw new InvariantViolation(
      'Task cannot be deleted while dependent tasks are incomplete'
    )
  }
}

/**
 * Dependency invariants
 */
export function assertValidDependency(
  taskId: string,
  dependsOnTaskId: string
) {
  if (taskId === dependsOnTaskId) {
    throw new InvariantViolation(
      'Task cannot depend on itself'
    )
  }
}

/// Goal consistency invariant
export function assertDependencyWithinSameGoal(
  taskGoalId: string,
  dependsOnTaskGoalId: string,
) {
  if (taskGoalId !== dependsOnTaskGoalId) {
    throw new InvariantViolation(
      'Tasks may only depend on other tasks within the same goal'
    )
  }
}

/**
 * Cycle detection invariant
 *
 * If task A depends on B, and B (directly or indirectly) depends on A,
 * adding this dependency would create a cycle.
 */
export function assertNoDependencyCycle(
  taskId: string,
  dependsOnTaskId: string,
  transitiveDependencyIds: string[],
) {
  if (transitiveDependencyIds.includes(taskId)) {
    throw new InvariantViolation(
      'Adding this dependency would create a circular dependency'
    )
  }
}

/**
 * Status transition invariants
 */
export function assertValidTaskStatusTransition(
  from: TaskStatus, 
  to: TaskStatus
) {
  // Define allowed transitions where keys are current statuses and values are arrays of valid next statuses
  const allowed: Record<TaskStatus, TaskStatus[]> = {
    [TaskStatus.todo]: [TaskStatus.in_progress],
    [TaskStatus.in_progress]: [TaskStatus.done, TaskStatus.blocked],
    [TaskStatus.blocked]: [TaskStatus.todo],
    [TaskStatus.done]: [],
  }

  // Check if the transition from 'from' to 'to' is allowed
  if (!allowed[from].includes(to)) {
    throw new InvariantViolation(
      `Invalid task status transition: ${from} → ${to}`
    )
  }
}

// Subtask invariants
export function assertValidSubtask(
  parentGoalId: string,
  subtaskGoalId: string,
) {
  if (parentGoalId !== subtaskGoalId) {
    throw new InvariantViolation(
      'Subtasks must belong to the same goal as their parent task'
    )
  }
}

/**
 * Hard vs. soft dependency detection for scheduling
 */

// Detect if task update invalidates existing schedule
export function detectScheduleInvalidation(
  originalTask: Task,
  updatedFields: Partial<Task>,
): boolean {

  if (
    updatedFields.estimated_minutes !== undefined &&
    updatedFields.estimated_minutes !== originalTask.estimated_minutes
  ) {
    return true
  }

  return false
}

// Detect if task update introduces scheduling risk
export function detectScheduleExecutionRisk(
  originalTask: Task,
  updatedFields: Partial<Task>, // Partial representation of Task
): boolean {

  if (
    updatedFields.status === TaskStatus.blocked &&
    originalTask.status !== TaskStatus.blocked
  ) {
    return true
  }

  if (
    updatedFields.priority_score !== undefined &&
    updatedFields.priority_score !== originalTask.priority_score
  ) {
    return true
  }

  return false
}
