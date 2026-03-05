// src/auth/auth.invariants.ts

import { BadRequestException, UnauthorizedException } from '@nestjs/common'

/**
 * A1 — Password strength
 */
export function assertPasswordStrength(password: string) {
  if (!password || password.length < 8) {
    throw new BadRequestException(
      'Password must be at least 8 characters',
    )
  }

  const hasLetter = /[A-Za-z]/.test(password)
  const hasNumber = /\d/.test(password)

  if (!hasLetter || !hasNumber) {
    throw new BadRequestException(
      'Password must contain letters and numbers',
    )
  }
}

/**
 * A2 — User must exist
 */
export function assertUserExists(user: any) {
  if (!user) {
    throw new UnauthorizedException('Invalid credentials')
  }
}

/**
 * A3 — User must not be soft deleted
 */
export function assertUserActive(deletedAt: Date | null) {
  if (deletedAt) {
    throw new UnauthorizedException('Account is deactivated')
  }
}
