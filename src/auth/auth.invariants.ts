import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import { InvariantViolation } from '../common/errors/invariant-violation'

/**
 * Signup invariants
 */
export function assertPasswordStrength(password: string) {
  if (!password || password.length < 8) {
    throw new InvariantViolation(
      'Password must be at least 8 characters long'
    )
  }
}

export function assertValidEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    throw new InvariantViolation('Invalid email address')
  }
}

export function assertUserNotAlreadyRegistered(existingUser: unknown) {
  if (existingUser) {
    throw new InvariantViolation('A user with this email already exists')
  }
}

/**
 * Login invariants 
 */
export function assertUserExists(user: { password_hash?: string | null } | null) {
  if (!user || !user.password_hash) {
    throw new UnauthorizedException('Invalid credentials') // Don't reveal whether email or password was incorrect
  }
}

export function assertPasswordValid(isValid: boolean) {
  if (!isValid) {
    throw new UnauthorizedException('Invalid credentials') // Don't reveal whether email or password was incorrect
  }
}

/**
 * User update invariants
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