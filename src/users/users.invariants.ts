import { InvariantViolation } from '../common/errors/invariant-violation'

/**
 * Email invariants
 */
export function assertValidEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    throw new InvariantViolation('Invalid email address')
  }
}

/**
 * Registration invariants
 */
export function assertUserNotDeleted(deletedAt: Date | null) {
  if (deletedAt !== null) {
    throw new InvariantViolation('This account has been deleted')
  }
}

export function assertUserNotAlreadyRegistered(existingUser: unknown) {
  if (existingUser) {
    throw new InvariantViolation('A user with this email already exists')
  }
}

/**
 * Ownership invariants
 */
export function assertUserOwnership(
  requestingUserId: string,
  targetUserId: string,
) {
  if (requestingUserId !== targetUserId) {
    throw new InvariantViolation(
      'You do not have permission to modify this user'
    )
  }
}

/**
 * Profile update invariants
 */
export function assertNameNotEmpty(name: string) {
  if (!name || name.trim().length === 0) {
    throw new InvariantViolation('Name cannot be empty')
  }
}

export function assertNameLength(name: string, maxLength = 100) {
  if (name.trim().length > maxLength) {
    throw new InvariantViolation(
      `Name cannot exceed ${maxLength} characters`
    )
  }
}

/**
 * Password change invariants
 */
export function assertNewPasswordDiffersFromCurrent(
  currentPassword: string,
  newPassword: string,
) {
  if (currentPassword === newPassword) {
    throw new InvariantViolation(
      'New password must be different from the current password'
    )
  }
}