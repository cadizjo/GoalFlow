import { BadRequestException } from '@nestjs/common'
import { InvariantViolation } from './invariant-violation'

// Handle invariant violations by converting them to HTTP BadRequestExceptions
export function handleInvariant(error: unknown): never {
  if (error instanceof InvariantViolation) {
    throw new BadRequestException(error.message) // Convert to HTTP exception
  }
  throw error
}
