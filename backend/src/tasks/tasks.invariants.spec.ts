import { Task, TaskStatus } from '@prisma/client'
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

    it('rejects zero actual minutes', () => {
      expect(() =>
        assertTaskCanBeCompleted(TaskStatus.in_progress, 0, 0)
      ).toThrow('Actual minutes')
    })
  })

  describe('assertTaskDeletable', () => {
    it('allows deletion of a todo task with no dependents', () => {
      expect(() =>
        assertTaskDeletable(TaskStatus.todo, 0)
      ).not.toThrow()
    })

    it('allows deletion of a blocked task with no dependents', () => {
      expect(() =>
        assertTaskDeletable(TaskStatus.blocked, 0)
      ).not.toThrow()
    })

    it('rejects deleting a completed task', () => {
      expect(() =>
        assertTaskDeletable(TaskStatus.done, 0)
      ).toThrow('Completed tasks')
    })

    it('rejects deleting a task with incomplete dependents', () => {
      expect(() =>
        assertTaskDeletable(TaskStatus.todo, 2)
      ).toThrow('dependent')
    })
  })

  describe('assertValidDependency', () => {
    it('allows a dependency between different tasks', () => {
      expect(() =>
        assertValidDependency('task1', 'task2')
      ).not.toThrow()
    })

    it('rejects self-dependency', () => {
      expect(() =>
        assertValidDependency('task1', 'task1')
      ).toThrow('itself')
    })
  })

  describe('assertDependencyWithinSameGoal', () => {
    it('allows dependency within the same goal', () => {
      expect(() =>
        assertDependencyWithinSameGoal('goal1', 'goal1')
      ).not.toThrow()
    })

    it('rejects cross-goal dependency', () => {
      expect(() =>
        assertDependencyWithinSameGoal('goal1', 'goal2')
      ).toThrow('same goal')
    })
  })

  describe('assertNoDependencyCycle', () => {
    it('allows a valid dependency', () => {
      expect(() =>
        assertNoDependencyCycle('taskA', 'taskB', ['taskC'])
      ).not.toThrow()
    })

    it('allows when transitive list is empty', () => {
      expect(() =>
        assertNoDependencyCycle('taskA', 'taskB', [])
      ).not.toThrow()
    })

    it('rejects a circular dependency', () => {
      expect(() =>
        assertNoDependencyCycle('taskA', 'taskB', ['taskA'])
      ).toThrow('circular')
    })
  })

  describe('assertValidTaskStatusTransition', () => {
    it('allows todo → in_progress', () => {
      expect(() =>
        assertValidTaskStatusTransition(TaskStatus.todo, TaskStatus.in_progress)
      ).not.toThrow()
    })

    it('allows in_progress → done', () => {
      expect(() =>
        assertValidTaskStatusTransition(TaskStatus.in_progress, TaskStatus.done)
      ).not.toThrow()
    })

    it('allows in_progress → blocked', () => {
      expect(() =>
        assertValidTaskStatusTransition(TaskStatus.in_progress, TaskStatus.blocked)
      ).not.toThrow()
    })

    it('allows blocked → todo', () => {
      expect(() =>
        assertValidTaskStatusTransition(TaskStatus.blocked, TaskStatus.todo)
      ).not.toThrow()
    })

    it('rejects todo → done', () => {
      expect(() =>
        assertValidTaskStatusTransition(TaskStatus.todo, TaskStatus.done)
      ).toThrow('Invalid task status transition')
    })

    it('rejects todo → blocked', () => {
      expect(() =>
        assertValidTaskStatusTransition(TaskStatus.todo, TaskStatus.blocked)
      ).toThrow(InvariantViolation)
    })

    it('rejects done → any status', () => {
      expect(() =>
        assertValidTaskStatusTransition(TaskStatus.done, TaskStatus.todo)
      ).toThrow(InvariantViolation)
    })

    it('rejects blocked → done', () => {
      expect(() =>
        assertValidTaskStatusTransition(TaskStatus.blocked, TaskStatus.done)
      ).toThrow(InvariantViolation)
    })
  })

  describe('assertValidSubtask', () => {
    it('allows a subtask within the same goal', () => {
      expect(() =>
        assertValidSubtask('goal1', 'goal1')
      ).not.toThrow()
    })

    it('rejects a subtask across goals', () => {
      expect(() =>
        assertValidSubtask('goal1', 'goal2')
      ).toThrow('same goal')
    })
  })

  describe('detectScheduleInvalidation', () => {
    const baseTask = {
      estimated_minutes: 60,
      priority_score: 0.5,
      status: TaskStatus.todo,
    } as Task

    it('detects invalidation when estimated minutes change', () => {
      expect(
        detectScheduleInvalidation(baseTask, { estimated_minutes: 90 })
      ).toBe(true)
    })

    it('does not invalidate when estimated minutes are unchanged', () => {
      expect(
        detectScheduleInvalidation(baseTask, { estimated_minutes: 60 })
      ).toBe(false)
    })

    it('does not invalidate when unrelated fields change', () => {
      expect(
        detectScheduleInvalidation(baseTask, { description: 'new' } as any)
      ).toBe(false)
    })
  })

  describe('detectScheduleExecutionRisk', () => {
    const baseTask = {
      estimated_minutes: 60,
      priority_score: 0.5,
      status: TaskStatus.todo,
    } as Task

    it('detects risk when status changes to blocked', () => {
      expect(
        detectScheduleExecutionRisk(baseTask, { status: TaskStatus.blocked })
      ).toBe(true)
    })

    it('does not flag risk when status is already blocked', () => {
      const blockedTask = { ...baseTask, status: TaskStatus.blocked }
      expect(
        detectScheduleExecutionRisk(blockedTask, { status: TaskStatus.blocked })
      ).toBe(false)
    })

    it('detects risk when priority score changes', () => {
      expect(
        detectScheduleExecutionRisk(baseTask, { priority_score: 1 })
      ).toBe(true)
    })

    it('does not flag risk when priority score is unchanged', () => {
      expect(
        detectScheduleExecutionRisk(baseTask, { priority_score: 0.5 })
      ).toBe(false)
    })

    it('does not flag risk when unrelated fields change', () => {
      expect(
        detectScheduleExecutionRisk(baseTask, { description: 'new' } as any)
      ).toBe(false)
    })
  })
})