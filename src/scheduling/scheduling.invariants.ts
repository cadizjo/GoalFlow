// src/scheduling/scheduling.invariants.ts
import { ScheduleStatus, TaskStatus } from '@prisma/client'
import { InvariantViolation } from '../common/errors/invariant-violation'

/**
 * No overlapping schedule blocks (per user)
 */
export function assertNoScheduleOverlap(
  overlappingCount: number,
) {
  if (overlappingCount !== 0) {
    throw new InvariantViolation(
      'Schedule block overlaps with an existing block'
    )
  }
}

/**
 * Task must be schedulable
 */
export function assertTaskCanBeScheduled(
  taskStatus: TaskStatus,
  incompleteDependencyCount: number,
) {
  if (taskStatus === TaskStatus.done) {
    throw new InvariantViolation(
      'Completed tasks cannot be scheduled'
    )
  }

  if (incompleteDependencyCount > 0) {
    throw new InvariantViolation(
      'Task has unmet dependencies and cannot be scheduled'
    )
  }
}

/**
 * Completed schedule blocks are immutable
 */
export function assertScheduleBlockIsMutable(
  status: ScheduleStatus,
) {
  if (status === ScheduleStatus.completed) {
    throw new InvariantViolation(
      'Completed schedule blocks cannot be modified'
    )
  }
}

/**
 * Time range must be valid
 */
export function assertValidTimeRange(
  start: Date,
  end: Date,
) {
  if (start >= end) {
    throw new InvariantViolation(
      'Schedule block start_time must be before end_time'
    )
  }
}
