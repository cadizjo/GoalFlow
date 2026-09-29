import { Injectable, OnModuleInit } from '@nestjs/common'
import { MilestonesRepository } from './milestones.repo'
import { EventLogService } from '../event-log/event-log.service'

@Injectable()
export class MilestonesGoalEventHandler implements OnModuleInit {
  constructor(
    private readonly milestonesRepo: MilestonesRepository,
    private readonly eventLog: EventLogService,
  ) {}

  onModuleInit() {
    this.eventLog.registerHandler('goal.deleted', async ({ goal_id, user_id }) => {
      await this.handleGoalDeleted(goal_id, user_id)
    })
  }

  // When a goal is deleted, soft-delete all its milestones.
  // Tasks are handled separately by TasksGoalEventHandler — no need to touch them here.
  async handleGoalDeleted(goalId: string, userId: string) {
    const milestones = await this.milestonesRepo.findAllByGoal(goalId)

    for (const milestone of milestones) {
      await this.milestonesRepo.softDelete(milestone.id)

      await this.eventLog.log(userId, 'milestone.deleted', {
        milestone_id: milestone.id,
        goal_id: goalId,
        user_id: userId,
        reason: 'goal_deleted',
      })
    }
  }
}