import {
  assertNoScheduleOverlap,
  assertTaskIsSchedulable,
  assertTaskDependenciesComplete,
  assertScheduleBlockIsMutable,
  assertValidTimeRange,
} from './scheduling.invariants'
import { InvariantViolation } from '../common/errors/invariant-violation'
import { ScheduleStatus, TaskStatus } from '@prisma/client'

describe('Scheduling invariants', () => {

  describe('assertNoScheduleOverlap', () => {
    it('allows no overlap', () => {
      expect(() => assertNoScheduleOverlap(0)).not.toThrow()
    })

    it('rejects overlapping blocks', () => {
      expect(() => assertNoScheduleOverlap(1)).toThrow(
        'overlaps'
      )
    })
  })

  describe('assertTaskIsSchedulable', () => {
    it('allows scheduling non-completed task', () => {
      expect(() =>
        assertTaskIsSchedulable(TaskStatus.todo)
      ).not.toThrow()
    })

    it('rejects scheduling completed task', () => {
      expect(() =>
        assertTaskIsSchedulable(TaskStatus.done)
      ).toThrow('Completed tasks')
    })
  })

  describe('assertTaskDependenciesComplete', () => {
    it('allows completion with no incomplete dependencies', () => {
      expect(() =>
        assertTaskDependenciesComplete([])
      ).not.toThrow()
    })

    it('rejects completion with incomplete dependencies', () => {
      expect(() =>
        assertTaskDependenciesComplete([{ id: 'dep1' }])
      ).toThrow('dependencies')
    })
  })

  describe('assertScheduleBlockIsMutable', () => {
    it('allows modifying scheduled block', () => {
      expect(() =>
        assertScheduleBlockIsMutable(ScheduleStatus.scheduled)
      ).not.toThrow()
    })

    it('rejects modifying completed block', () => {
      expect(() =>
        assertScheduleBlockIsMutable(ScheduleStatus.completed)
      ).toThrow('cannot be modified')
    })
  })

  describe('assertValidTimeRange', () => {
    it('allows valid time range', () => {
      expect(() =>
        assertValidTimeRange(
          new Date('2026-01-01T10:00:00Z'),
          new Date('2026-01-01T11:00:00Z')
        )
      ).not.toThrow()
    })

    it('rejects invalid time range', () => {
      expect(() =>
        assertValidTimeRange(
          new Date('2026-01-01T11:00:00Z'),
          new Date('2026-01-01T10:00:00Z')
        )
      ).toThrow('start_time')
    })
  })
})
