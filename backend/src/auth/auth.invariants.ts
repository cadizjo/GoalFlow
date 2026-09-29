import { InvariantViolation } from '../common/errors/invariant-violation'
import { UnauthorizedException } from '@nestjs/common';

/**
 * Login invariants (throw 401 Unauthorized for all login-related errors to avoid leaking information about which part of the credentials was incorrect)
 */
export function assertUserExists(user: { password_hash?: string | null } | null) {
  if (!user || !user.password_hash) {
    throw new UnauthorizedException('Invalid credentials') 
  }
}

export function assertPasswordValid(isValid: boolean) {
  if (!isValid) {
    throw new UnauthorizedException('Invalid credentials') 
  }
}

/**
 * Signup invariants
 */
export function assertPasswordStrength(password: string) {
  if (!password || password.length < 8) {
    throw new InvariantViolation('Password must be at least 8 characters long')
  }
}