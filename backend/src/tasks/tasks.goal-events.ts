import { Injectable, OnModuleInit } from '@nestjs/common'
import { TasksRepository } from './tasks.repo'
import { EventLogService } from '../event-log/event-log.service'

@Injectable()
export class TasksGoalEventHandler implements OnModuleInit {
  constructor(
    private readonly tasksRepo: TasksRepository,
    private readonly eventLog: EventLogService,
  ) {}

  onModuleInit() {
    this.eventLog.registerHandler('goal.deleted', async ({ goal_id, user_id }) => {
      await this.handleGoalDeleted(goal_id, user_id)
    })
  }

  // When a goal is deleted, soft-delete all incomplete tasks belonging to it.
  // Firing task.deleted for each triggers SchedulingTaskEventHandler automatically,
  // which cascades to future schedule block cleanup.
  async handleGoalDeleted(goalId: string, userId: string) {
    const incompleteTasks = await this.tasksRepo.findIncompleteByGoal(goalId)

    for (const task of incompleteTasks) {
      await this.tasksRepo.deleteAllDependencies(task.id)
      await this.tasksRepo.softDelete(task.id)

      await this.eventLog.log(userId, 'task.deleted', {
        task_id: task.id,
        goal_id: goalId,
        reason: 'goal_deleted',
      })
    }
  }
}