import {
  assertValidEmail,
  assertUserNotDeleted,
  assertUserNotAlreadyRegistered,
  assertUserOwnership,
  assertNameNotEmpty,
  assertNameLength,
  assertNewPasswordDiffersFromCurrent,
} from './users.invariants'
import { InvariantViolation } from '../common/errors/invariant-violation'

describe('User invariants', () => {

  describe('assertUserNotDeleted', () => {
    it('allows access when deleted_at is null', () => {
      expect(() =>
        assertUserNotDeleted(null)
      ).not.toThrow()
    })

    it('rejects access when deleted_at is set', () => {
      expect(() =>
        assertUserNotDeleted(new Date())
      ).toThrow(InvariantViolation)
    })

    it('rejects with the correct message', () => {
      expect(() =>
        assertUserNotDeleted(new Date())
      ).toThrow('deleted')
    })
  })

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

  describe('assertUserNotAlreadyRegistered', () => {
    it('allows signup when no existing user is found', () => {
      expect(() =>
        assertUserNotAlreadyRegistered(null)
      ).not.toThrow()
    })

    it('allows signup when existing user is undefined', () => {
      expect(() =>
        assertUserNotAlreadyRegistered(undefined)
      ).not.toThrow()
    })

    it('rejects signup when a user already exists', () => {
      expect(() =>
        assertUserNotAlreadyRegistered({ id: 'user-1', email: 'user@example.com' })
      ).toThrow(InvariantViolation)
    })

    it('rejects with the correct message', () => {
      expect(() =>
        assertUserNotAlreadyRegistered({ id: 'user-1' })
      ).toThrow('already exists')
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

  describe('assertNameNotEmpty', () => {
    it('allows a valid name', () => {
      expect(() =>
        assertNameNotEmpty('John Doe')
      ).not.toThrow()
    })

    it('rejects an empty string', () => {
      expect(() =>
        assertNameNotEmpty('')
      ).toThrow(InvariantViolation)
    })

    it('rejects a whitespace-only string', () => {
      expect(() =>
        assertNameNotEmpty('   ')
      ).toThrow('empty')
    })
  })

  describe('assertNameLength', () => {
    it('allows a name within the default limit', () => {
      expect(() =>
        assertNameLength('John Doe')
      ).not.toThrow()
    })

    it('allows a name at exactly the limit', () => {
      expect(() =>
        assertNameLength('a'.repeat(100))
      ).not.toThrow()
    })

    it('rejects a name exceeding the default limit', () => {
      expect(() =>
        assertNameLength('a'.repeat(101))
      ).toThrow(InvariantViolation)
    })

    it('respects a custom max length', () => {
      expect(() =>
        assertNameLength('a'.repeat(21), 20)
      ).toThrow('exceed')
    })
  })

  describe('assertNewPasswordDiffersFromCurrent', () => {
    it('allows a new password that differs from the current', () => {
      expect(() =>
        assertNewPasswordDiffersFromCurrent('oldpassword', 'newpassword')
      ).not.toThrow()
    })

    it('rejects when new password is the same as current', () => {
      expect(() =>
        assertNewPasswordDiffersFromCurrent('samepassword', 'samepassword')
      ).toThrow(InvariantViolation)
    })

    it('rejects with the correct message', () => {
      expect(() =>
        assertNewPasswordDiffersFromCurrent('password123', 'password123')
      ).toThrow('different')
    })
  })
})