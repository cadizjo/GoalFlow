import { ScheduleStatus, TaskDependency, TaskStatus } from '@prisma/client'
import { InvariantViolation } from '../common/errors/invariant-violation'

/**
 * Time range invariants
 */
export function assertValidTimeRange(start: Date, end: Date) {
  if (start >= end) {
    throw new InvariantViolation(
      'Schedule block start_time must be before end_time'
    )
  }
}

/**
 * Overlap invariants
 */
export function assertNoScheduleOverlap(overlappingCount: number) {
  if (overlappingCount !== 0) {
    throw new InvariantViolation(
      'Schedule block overlaps with an existing block'
    )
  }
}

/**
 * Task schedulability invariants
 */
export function assertTaskIsSchedulable(taskStatus: TaskStatus) {
  if (taskStatus === TaskStatus.done) {
    throw new InvariantViolation('Completed tasks cannot be scheduled')
  }
}

/**
 * Dependency invariants
 */
export function assertTaskDependenciesComplete(
  incompleteDependencies: TaskDependency[],
) {
  if (incompleteDependencies.length > 0) {
    throw new InvariantViolation('Task has incomplete dependencies')
  }
}

/**
 * Mutability invariants
 */
export function assertScheduleBlockIsMutable(status: ScheduleStatus) {
  if (status === ScheduleStatus.completed) {
    throw new InvariantViolation(
      'Completed schedule blocks cannot be modified'
    )
  }
}