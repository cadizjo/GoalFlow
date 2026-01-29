import { TaskStatus } from '@prisma/client'
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
    todo: ['in_progress'],
    in_progress: ['done', 'blocked'],
    blocked: ['todo'],
    done: []
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
