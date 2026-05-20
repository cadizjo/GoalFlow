import {
  assertValidEmail,
  assertPasswordStrength,
  assertUserNotAlreadyRegistered,
  assertUserExists,
  assertPasswordValid,
  assertUserOwnership,
} from './auth.invariants'
import { InvariantViolation } from '../common/errors/invariant-violation'

describe('Auth invariants', () => {

  describe('assertValidEmail', () => {
    it('allows a valid email', () => {
      expect(() =>
        assertValidEmail('user@example.com')
      ).not.toThrow()
    })

    it('rejects an email missing the @ symbol', () => {
      expect(() =>
        assertValidEmail('userexample.com')
      ).toThrow(InvariantViolation)
    })

    it('rejects an email missing a domain', () => {
      expect(() =>
        assertValidEmail('user@')
      ).toThrow('Invalid email')
    })

    it('rejects an empty string', () => {
      expect(() =>
        assertValidEmail('')
      ).toThrow(InvariantViolation)
    })
  })

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

  describe('assertUserNotAlreadyRegistered', () => {
    it('allows signup when no existing user is found', () => {
      expect(() =>
        assertUserNotAlreadyRegistered(null)
      ).not.toThrow()
    })

    it('rejects signup when a user already exists', () => {
      expect(() =>
        assertUserNotAlreadyRegistered({ id: 'user-1', email: 'user@example.com' })
      ).toThrow(InvariantViolation)
    })

    it('rejects signup when existing user is undefined', () => {
      expect(() =>
        assertUserNotAlreadyRegistered(undefined)
      ).not.toThrow()
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
      ).toThrow(InvariantViolation)
    })

    it('rejects login when password hash is missing', () => {
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
      ).toThrow(InvariantViolation)
    })

    it('rejects login with the correct message', () => {
      expect(() =>
        assertPasswordValid(false)
      ).toThrow('Invalid credentials')
    })
  })

  describe('assertUserOwnership', () => {
    it('allows action when user IDs match', () => {
      expect(() =>
        assertUserOwnership('user-1', 'user-1')
      ).not.toThrow()
    })

    it('rejects action when user IDs differ', () => {
      expect(() =>
        assertUserOwnership('user-1', 'user-2')
      ).toThrow(InvariantViolation)
    })

    it('rejects with a permission message', () => {
      expect(() =>
        assertUserOwnership('user-1', 'user-2')
      ).toThrow('permission')
    })
  })
})