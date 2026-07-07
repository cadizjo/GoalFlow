import { GoalStatus } from '@prisma/client'
import {
  assertGoalOwnedByUser,
  assertGoalNotDeleted,
  assertGoalIsActive,
  assertGoalDeletable,
  assertValidGoalStatusTransition,
  assertDeadlineInFuture,
  assertDeadlineNotMovedBack,
  assertGoalTitleNotEmpty,
  assertGoalTitleLength,
} from './goals.invariants'
import { InvariantViolation } from '../common/errors/invariant-violation'

describe('Goal invariants', () => {

  describe('assertGoalOwnedByUser', () => {
    it('allows access when user IDs match', () => {
      expect(() =>
        assertGoalOwnedByUser('user-1', 'user-1')
      ).not.toThrow()
    })

    it('rejects access when user IDs differ', () => {
      expect(() =>
        assertGoalOwnedByUser('user-1', 'user-2')
      ).toThrow(InvariantViolation)
    })

    it('rejects with the correct message', () => {
      expect(() =>
        assertGoalOwnedByUser('user-1', 'user-2')
      ).toThrow('access')
    })
  })

  describe('assertGoalNotDeleted', () => {
    it('allows access when deleted_at is null', () => {
      expect(() =>
        assertGoalNotDeleted(null)
      ).not.toThrow()
    })

    it('rejects access when deleted_at is set', () => {
      expect(() =>
        assertGoalNotDeleted(new Date())
      ).toThrow(InvariantViolation)
    })

    it('rejects with the correct message', () => {
      expect(() =>
        assertGoalNotDeleted(new Date())
      ).toThrow('deleted')
    })
  })

  describe('assertGoalIsActive', () => {
    it('allows access when goal is active and not deleted', () => {
      expect(() =>
        assertGoalIsActive(null, GoalStatus.active)
      ).not.toThrow()
    })

    it('allows access when goal is at_risk and not deleted', () => {
      expect(() =>
        assertGoalIsActive(null, GoalStatus.at_risk)
      ).not.toThrow()
    })

    it('rejects when goal is soft-deleted', () => {
      expect(() =>
        assertGoalIsActive(new Date(), GoalStatus.active)
      ).toThrow(InvariantViolation)
    })

    it('rejects when goal is completed', () => {
      expect(() =>
        assertGoalIsActive(null, GoalStatus.completed)
      ).toThrow('completed')
    })

    it('rejects deleted message correctly', () => {
      expect(() =>
        assertGoalIsActive(new Date(), GoalStatus.active)
      ).toThrow('deleted')
    })
  })

  describe('assertGoalDeletable', () => {
    it('allows deletion of an active goal', () => {
      expect(() =>
        assertGoalDeletable(GoalStatus.active)
      ).not.toThrow()
    })

    it('allows deletion of an at_risk goal', () => {
      expect(() =>
        assertGoalDeletable(GoalStatus.at_risk)
      ).not.toThrow()
    })

    it('rejects deletion of a completed goal', () => {
      expect(() =>
        assertGoalDeletable(GoalStatus.completed)
      ).toThrow('Completed goals')
    })
  })

  describe('assertValidGoalStatusTransition', () => {
    it('allows active → completed', () => {
      expect(() =>
        assertValidGoalStatusTransition(GoalStatus.active, GoalStatus.completed)
      ).not.toThrow()
    })

    it('allows active → at_risk', () => {
      expect(() =>
        assertValidGoalStatusTransition(GoalStatus.active, GoalStatus.at_risk)
      ).not.toThrow()
    })

    it('allows at_risk → active', () => {
      expect(() =>
        assertValidGoalStatusTransition(GoalStatus.at_risk, GoalStatus.active)
      ).not.toThrow()
    })

    it('allows at_risk → completed', () => {
      expect(() =>
        assertValidGoalStatusTransition(GoalStatus.at_risk, GoalStatus.completed)
      ).not.toThrow()
    })

    it('rejects completed → active', () => {
      expect(() =>
        assertValidGoalStatusTransition(GoalStatus.completed, GoalStatus.active)
      ).toThrow(InvariantViolation)
    })

    it('rejects completed → at_risk', () => {
      expect(() =>
        assertValidGoalStatusTransition(GoalStatus.completed, GoalStatus.at_risk)
      ).toThrow('Invalid goal status transition')
    })
  })

  describe('assertDeadlineInFuture', () => {
    it('allows a deadline in the future', () => {
      const future = new Date(Date.now() + 1000 * 60 * 60 * 24)
      expect(() =>
        assertDeadlineInFuture(future)
      ).not.toThrow()
    })

    it('rejects a deadline in the past', () => {
      const past = new Date(Date.now() - 1000)
      expect(() =>
        assertDeadlineInFuture(past)
      ).toThrow(InvariantViolation)
    })

    it('rejects a deadline of now', () => {
      expect(() =>
        assertDeadlineInFuture(new Date())
      ).toThrow('future')
    })
  })

  describe('assertDeadlineNotMovedBack', () => {
    const current = new Date('2030-06-01')

    it('allows moving the deadline forward', () => {
      expect(() =>
        assertDeadlineNotMovedBack(current, new Date('2030-07-01'))
      ).not.toThrow()
    })

    it('allows keeping the same deadline', () => {
      expect(() =>
        assertDeadlineNotMovedBack(current, new Date('2030-06-01'))
      ).not.toThrow()
    })

    it('rejects moving the deadline back', () => {
      expect(() =>
        assertDeadlineNotMovedBack(current, new Date('2030-05-01'))
      ).toThrow(InvariantViolation)
    })

    it('rejects with the correct message', () => {
      expect(() =>
        assertDeadlineNotMovedBack(current, new Date('2030-01-01'))
      ).toThrow('earlier')
    })
  })

  describe('assertGoalTitleNotEmpty', () => {
    it('allows a valid title', () => {
      expect(() =>
        assertGoalTitleNotEmpty('Learn TypeScript')
      ).not.toThrow()
    })

    it('rejects an empty string', () => {
      expect(() =>
        assertGoalTitleNotEmpty('')
      ).toThrow(InvariantViolation)
    })

    it('rejects a whitespace-only string', () => {
      expect(() =>
        assertGoalTitleNotEmpty('   ')
      ).toThrow('empty')
    })
  })

  describe('assertGoalTitleLength', () => {
    it('allows a title within the default limit', () => {
      expect(() =>
        assertGoalTitleLength('Short title')
      ).not.toThrow()
    })

    it('allows a title at exactly the limit', () => {
      expect(() =>
        assertGoalTitleLength('a'.repeat(200))
      ).not.toThrow()
    })

    it('rejects a title exceeding the default limit', () => {
      expect(() =>
        assertGoalTitleLength('a'.repeat(201))
      ).toThrow(InvariantViolation)
    })

    it('respects a custom max length', () => {
      expect(() =>
        assertGoalTitleLength('a'.repeat(51), 50)
      ).toThrow('exceed')
    })
  })
})