// src/users/user.invariants.ts

import { BadRequestException, ForbiddenException } from '@nestjs/common'

/**
 * U1 — Email must be provided
 */
export function assertEmailProvided(email?: string) {
  if (!email || email.trim().length === 0) {
    throw new BadRequestException('Email is required')
  }
}

/**
 * U2 — Email cannot change once created
 */
export function assertEmailImmutable(
  currentEmail: string,
  newEmail?: string,
) {
  if (newEmail && newEmail !== currentEmail) {
    throw new ForbiddenException('Email cannot be changed')
  }
}

/**
 * U3 — Cannot operate on deleted user
 */
export function assertUserNotDeleted(deletedAt: Date | null) {
  if (deletedAt) {
    throw new ForbiddenException('User account is deleted')
  }
}
