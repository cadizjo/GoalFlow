import { InvariantViolation } from '../common/errors/invariant-violation'

/**
 * Title invariants
 */
export function assertMilestoneTitleNotEmpty(title: string) {
  if (!title || title.trim().length === 0) {
    throw new InvariantViolation('Milestone title cannot be empty')
  }
}

export function assertMilestoneTitleLength(title: string, maxLength = 200) {
  if (title.trim().length > maxLength) {
    throw new InvariantViolation(
      `Milestone title cannot exceed ${maxLength} characters`
    )
  }
}

/**
 * Sequence invariants
 */
export function assertSequenceIsPositive(sequence: number) {
  if (!Number.isInteger(sequence) || sequence < 0) {
    throw new InvariantViolation('Sequence must be a non-negative integer')
  }
}

export function assertSequenceNotTaken(isTaken: boolean) {
  if (isTaken) {
    throw new InvariantViolation(
      'A milestone with this sequence already exists in the goal'
    )
  }
}