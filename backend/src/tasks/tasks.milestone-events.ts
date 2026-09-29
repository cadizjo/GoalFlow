import { Injectable, OnModuleInit } from '@nestjs/common'
import { TasksRepository } from './tasks.repo'
import { EventLogService } from '../event-log/event-log.service'

@Injectable()
export class TasksMilestoneEventHandler implements OnModuleInit {
  constructor(
    private readonly tasksRepo: TasksRepository,
    private readonly eventLog: EventLogService,
  ) {}

  onModuleInit() {
    this.eventLog.registerHandler('milestone.deleted', async ({ milestone_id, goal_id, user_id, reason }) => {
      // No need to detach milestones here if the goal itself is being deleted
      if (reason === 'goal_deleted') return

      await this.handleMilestoneDeleted(milestone_id, goal_id, user_id)
    })
  }

  // When a milestone is directly deleted, detach its tasks back to the goal
  // rather than deleting them — milestone_id is optional, tasks are goal-owned first
  async handleMilestoneDeleted(milestoneId: string, goalId: string, userId: string) {
    await this.tasksRepo.detachFromMilestone(milestoneId)

    await this.eventLog.log(userId, 'tasks.milestone_detached', {
      milestone_id: milestoneId,
      goal_id: goalId,
    })
  }
}