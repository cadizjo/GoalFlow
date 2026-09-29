import {
  assertUserExists,
  assertPasswordValid,
  assertPasswordStrength,
} from './auth.invariants'
import { InvariantViolation } from '../common/errors/invariant-violation'
import { UnauthorizedException } from '@nestjs/common';

describe('Auth invariants', () => {

  describe('assertPasswordStrength', () => {
    it('allows a password of 8 or more characters', () => {
      expect(() =>
        assertPasswordStrength('password123')
      ).not.toThrow()
    })

    it('allows a password of exactly 8 characters', () => {
      expect(() =>
        assertPasswordStrength('exactly8')
      ).not.toThrow()
    })

    it('rejects a password shorter than 8 characters', () => {
      expect(() =>
        assertPasswordStrength('short')
      ).toThrow(InvariantViolation)
    })

    it('rejects an empty password', () => {
      expect(() =>
        assertPasswordStrength('')
      ).toThrow(InvariantViolation)
    })
  })

  describe('assertUserExists', () => {
    it('allows login when user with a password hash exists', () => {
      expect(() =>
        assertUserExists({ password_hash: 'hashed_password' })
      ).not.toThrow()
    })

    it('rejects login when user is null', () => {
      expect(() =>
        assertUserExists(null)
      ).toThrow(UnauthorizedException)
    })

    it('rejects login when password hash is null', () => {
      expect(() =>
        assertUserExists({ password_hash: null })
      ).toThrow('Invalid credentials')
    })

    it('rejects login when password hash is undefined', () => {
      expect(() =>
        assertUserExists({ password_hash: undefined })
      ).toThrow('Invalid credentials')
    })
  })

  describe('assertPasswordValid', () => {
    it('allows login when password is valid', () => {
      expect(() =>
        assertPasswordValid(true)
      ).not.toThrow()
    })

    it('rejects login when password does not match', () => {
      expect(() =>
        assertPasswordValid(false)
      ).toThrow(UnauthorizedException)
    })

    it('rejects with the correct message', () => {
      expect(() =>
        assertPasswordValid(false)
      ).toThrow('Invalid credentials')
    })
  })
})