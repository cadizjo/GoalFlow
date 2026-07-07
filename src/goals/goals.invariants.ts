import { GoalStatus } from '@prisma/client'
import { InvariantViolation } from '../common/errors/invariant-violation'

/**
 * Ownership invariants
 */
export function assertGoalOwnedByUser(
  goalUserId: string,
  requestingUserId: string,
) {
  if (goalUserId !== requestingUserId) {
    throw new InvariantViolation('You do not have access to this goal')
  }
}

/**
 * Goal activity invariants
 */
export function assertGoalIsActive(deletedAt: Date | null, status: GoalStatus) {
  if (deletedAt !== null) {
    throw new InvariantViolation('This goal has been deleted')
  }
  if (status === GoalStatus.completed) {
    throw new InvariantViolation('This goal has been completed and cannot be modified')
  }
}

/**
 * Soft delete invariants
 */
export function assertGoalNotDeleted(deletedAt: Date | null) {
  if (deletedAt !== null) {
    throw new InvariantViolation('This goal has been deleted')
  }
}

/**
 * Deletion invariants
 */
export function assertGoalDeletable(status: GoalStatus) {
  if (status === GoalStatus.completed) {
    throw new InvariantViolation('Completed goals cannot be deleted')
  }
}

/**
 * Status transition invariants
 */
export function assertValidGoalStatusTransition(
  from: GoalStatus,
  to: GoalStatus,
) {
  const allowed: Record<GoalStatus, GoalStatus[]> = {
    [GoalStatus.active]:    [GoalStatus.completed, GoalStatus.at_risk],
    [GoalStatus.at_risk]:   [GoalStatus.active, GoalStatus.completed],
    [GoalStatus.completed]: [],
  }

  if (!allowed[from].includes(to)) {
    throw new InvariantViolation(
      `Invalid goal status transition: ${from} → ${to}`
    )
  }
}

/**
 * Deadline invariants
 */
export function assertDeadlineInFuture(deadline: Date) {
  if (deadline <= new Date()) {
    throw new InvariantViolation('Goal deadline must be in the future')
  }
}

export function assertDeadlineNotMovedBack(
  currentDeadline: Date,
  newDeadline: Date,
) {
  if (newDeadline < currentDeadline) {
    throw new InvariantViolation(
      'Goal deadline cannot be moved to an earlier date'
    )
  }
}

/**
 * Title invariants
 */
export function assertGoalTitleNotEmpty(title: string) {
  if (!title || title.trim().length === 0) {
    throw new InvariantViolation('Goal title cannot be empty')
  }
}

export function assertGoalTitleLength(title: string, maxLength = 200) {
  if (title.trim().length > maxLength) {
    throw new InvariantViolation(
      `Goal title cannot exceed ${maxLength} characters`
    )
  }
}