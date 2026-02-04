import { TaskStatus } from '@prisma/client'
import {
  assertTaskCanBeCompleted,
  assertTaskDeletable,
  assertValidDependency,
  assertDependencyWithinSameGoal,
  assertNoDependencyCycle,
  assertValidTaskStatusTransition,
  assertValidSubtask,
  detectScheduleInvalidation,
  detectScheduleExecutionRisk,
} from './tasks.invariants'
import { InvariantViolation } from '../common/errors/invariant-violation'
import { Task } from '@prisma/client'

describe('Task invariants', () => {

  describe('assertTaskCanBeCompleted', () => {
    it('allows completion when valid', () => {
      expect(() =>
        assertTaskCanBeCompleted(TaskStatus.in_progress, 0, 30)
      ).not.toThrow()
    })

    it('rejects already completed tasks', () => {
      expect(() =>
        assertTaskCanBeCompleted(TaskStatus.done, 0, 30)
      ).toThrow(InvariantViolation)
    })

    it('rejects completion with incomplete dependencies', () => {
      expect(() =>
        assertTaskCanBeCompleted(TaskStatus.in_progress, 1, 30)
      ).toThrow('dependencies')
    })

    it('rejects missing actual minutes', () => {
      expect(() =>
        assertTaskCanBeCompleted(TaskStatus.in_progress, 0)
      ).toThrow('Actual minutes')
    })
  })

  describe('assertTaskDeletable', () => {
    it('allows deletion when valid', () => {
      expect(() =>
        assertTaskDeletable(TaskStatus.todo, 0)
      ).not.toThrow()
    })

    it('rejects deleting completed task', () => {
      expect(() =>
        assertTaskDeletable(TaskStatus.done, 0)
      ).toThrow('Completed tasks')
    })

    it('rejects deleting task with incomplete dependents', () => {
      expect(() =>
        assertTaskDeletable(TaskStatus.todo, 2)
      ).toThrow('dependent')
    })
  })

  describe('dependency invariants', () => {
    it('rejects self-dependency', () => {
      expect(() =>
        assertValidDependency('task1', 'task1')
      ).toThrow('itself')
    })

    it('rejects cross-goal dependency', () => {
      expect(() =>
        assertDependencyWithinSameGoal('goal1', 'goal2')
      ).toThrow('same goal')
    })

    it('rejects circular dependency', () => {
      expect(() =>
        assertNoDependencyCycle('taskA', 'taskB', ['taskA'])
      ).toThrow('circular')
    })

    it('allows valid dependency', () => {
      expect(() =>
        assertNoDependencyCycle('taskA', 'taskB', ['taskC'])
      ).not.toThrow()
    })
  })

  describe('status transition invariants', () => {
    it('allows valid transition', () => {
      expect(() =>
        assertValidTaskStatusTransition(
          TaskStatus.todo,
          TaskStatus.in_progress
        )
      ).not.toThrow()
    })

    it('rejects invalid transition', () => {
      expect(() =>
        assertValidTaskStatusTransition(
          TaskStatus.todo,
          TaskStatus.done
        )
      ).toThrow('Invalid task status transition')
    })
  })

  describe('subtask invariants', () => {
    it('allows subtask within same goal', () => {
      expect(() =>
        assertValidSubtask('goal1', 'goal1')
      ).not.toThrow()
    })

    it('rejects subtask across goals', () => {
      expect(() =>
        assertValidSubtask('goal1', 'goal2')
      ).toThrow('same goal')
    })
  })

  describe('schedule impact detection', () => {
    const baseTask = {
      estimated_minutes: 60,
      priority_score: 0.5,
      status: TaskStatus.todo,
    } as Task

    it('detects schedule invalidation on estimate change', () => {
      expect(
        detectScheduleInvalidation(baseTask, { estimated_minutes: 90 })
      ).toBe(true)
    })

    it('does not invalidate schedule when unrelated fields change', () => {
      expect(
        detectScheduleInvalidation(baseTask, { description: 'new' } as any)
      ).toBe(false)
    })

    it('detects execution risk when blocked', () => {
      expect(
        detectScheduleExecutionRisk(baseTask, { status: TaskStatus.blocked })
      ).toBe(true)
    })

    it('detects execution risk on priority change', () => {
      expect(
        detectScheduleExecutionRisk(baseTask, { priority_score: 1 })
      ).toBe(true)
    })
  })
})
