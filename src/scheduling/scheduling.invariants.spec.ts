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

  describe('assertValidTimeRange', () => {
    it('allows a valid time range', () => {
      expect(() =>
        assertValidTimeRange(
          new Date('2030-01-01T10:00:00Z'),
          new Date('2030-01-01T11:00:00Z'),
        )
      ).not.toThrow()
    })

    it('rejects end before start', () => {
      expect(() =>
        assertValidTimeRange(
          new Date('2030-01-01T11:00:00Z'),
          new Date('2030-01-01T10:00:00Z'),
        )
      ).toThrow('start_time')
    })

    it('rejects equal start and end', () => {
      const time = new Date('2030-01-01T10:00:00Z')
      expect(() =>
        assertValidTimeRange(time, time)
      ).toThrow(InvariantViolation)
    })
  })

  describe('assertNoScheduleOverlap', () => {
    it('allows when there are no overlaps', () => {
      expect(() => assertNoScheduleOverlap(0)).not.toThrow()
    })

    it('rejects when one overlap exists', () => {
      expect(() => assertNoScheduleOverlap(1)).toThrow('overlaps')
    })

    it('rejects when multiple overlaps exist', () => {
      expect(() => assertNoScheduleOverlap(3)).toThrow(InvariantViolation)
    })
  })

  describe('assertTaskIsSchedulable', () => {
    it('allows scheduling a todo task', () => {
      expect(() =>
        assertTaskIsSchedulable(TaskStatus.todo)
      ).not.toThrow()
    })

    it('allows scheduling an in_progress task', () => {
      expect(() =>
        assertTaskIsSchedulable(TaskStatus.in_progress)
      ).not.toThrow()
    })

    it('allows scheduling a blocked task', () => {
      expect(() =>
        assertTaskIsSchedulable(TaskStatus.blocked)
      ).not.toThrow()
    })

    it('rejects scheduling a completed task', () => {
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

    it('rejects completion with one incomplete dependency', () => {
      expect(() =>
        assertTaskDependenciesComplete([{ id: 'dep1' } as any])
      ).toThrow('dependencies')
    })

    it('rejects completion with multiple incomplete dependencies', () => {
      expect(() =>
        assertTaskDependenciesComplete([{ id: 'dep1' } as any, { id: 'dep2' } as any])
      ).toThrow(InvariantViolation)
    })
  })

  describe('assertScheduleBlockIsMutable', () => {
    it('allows modifying a scheduled block', () => {
      expect(() =>
        assertScheduleBlockIsMutable(ScheduleStatus.scheduled)
      ).not.toThrow()
    })

    it('rejects modifying a completed block', () => {
      expect(() =>
        assertScheduleBlockIsMutable(ScheduleStatus.completed)
      ).toThrow('cannot be modified')
    })
  })
})