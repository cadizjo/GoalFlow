// src/users/users.invariants.ts
import { InvariantViolation } from '../common/errors/invariant-violation'

/**
 * U1 — Email must be provided
 */
export function assertEmailProvided(email?: string | null) {
  if (!email) {
    throw new InvariantViolation('Email is required')
  }
}

/**
 * U2 — Email must be normalized
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * U3 — Email must be valid format
 */
export function assertValidEmailFormat(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(email)) {
    throw new InvariantViolation('Invalid email format')
  }
}

/**
 * U4 — Password hash must exist when creating user
 */
export function assertPasswordHashExists(passwordHash?: string | null) {
  if (!passwordHash) {
    throw new InvariantViolation('Password hash is required')
  }
}

/**
 * U5 — User email is immutable
 */
export function assertEmailImmutable(data: any) {
  if (data.email) {
    throw new InvariantViolation('Email cannot be updated')
  }
}