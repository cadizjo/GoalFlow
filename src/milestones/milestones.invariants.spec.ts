import {
  assertMilestoneTitleNotEmpty,
  assertMilestoneTitleLength,
  assertSequenceIsPositive,
  assertSequenceNotTaken,
} from './milestones.invariants'
import { InvariantViolation } from '../common/errors/invariant-violation'

describe('Milestone invariants', () => {

  describe('assertMilestoneTitleNotEmpty', () => {
    it('allows a valid title', () => {
      expect(() =>
        assertMilestoneTitleNotEmpty('Launch MVP')
      ).not.toThrow()
    })

    it('rejects an empty string', () => {
      expect(() =>
        assertMilestoneTitleNotEmpty('')
      ).toThrow(InvariantViolation)
    })

    it('rejects a whitespace-only string', () => {
      expect(() =>
        assertMilestoneTitleNotEmpty('   ')
      ).toThrow('empty')
    })
  })

  describe('assertMilestoneTitleLength', () => {
    it('allows a title within the default limit', () => {
      expect(() =>
        assertMilestoneTitleLength('Short title')
      ).not.toThrow()
    })

    it('allows a title at exactly the limit', () => {
      expect(() =>
        assertMilestoneTitleLength('a'.repeat(200))
      ).not.toThrow()
    })

    it('rejects a title exceeding the default limit', () => {
      expect(() =>
        assertMilestoneTitleLength('a'.repeat(201))
      ).toThrow(InvariantViolation)
    })

    it('respects a custom max length', () => {
      expect(() =>
        assertMilestoneTitleLength('a'.repeat(51), 50)
      ).toThrow('exceed')
    })
  })

  describe('assertSequenceIsPositive', () => {
    it('allows sequence 0', () => {
      expect(() =>
        assertSequenceIsPositive(0)
      ).not.toThrow()
    })

    it('allows a positive integer', () => {
      expect(() =>
        assertSequenceIsPositive(3)
      ).not.toThrow()
    })

    it('rejects a negative integer', () => {
      expect(() =>
        assertSequenceIsPositive(-1)
      ).toThrow(InvariantViolation)
    })

    it('rejects a float', () => {
      expect(() =>
        assertSequenceIsPositive(1.5)
      ).toThrow('non-negative integer')
    })
  })

  describe('assertSequenceNotTaken', () => {
    it('allows when sequence is not taken', () => {
      expect(() =>
        assertSequenceNotTaken(false)
      ).not.toThrow()
    })

    it('rejects when sequence is already taken', () => {
      expect(() =>
        assertSequenceNotTaken(true)
      ).toThrow(InvariantViolation)
    })

    it('rejects with the correct message', () => {
      expect(() =>
        assertSequenceNotTaken(true)
      ).toThrow('already exists')
    })
  })
})