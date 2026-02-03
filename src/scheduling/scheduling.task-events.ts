import { Injectable, OnModuleInit } from '@nestjs/common'
import { ScheduleBlocksRepository } from './scheduling.repo'
import { EventLogService } from 'src/event-log/event-log.service'

// Event handler for task-related events affecting scheduling
@Injectable()
export class SchedulingTaskEventHandler implements OnModuleInit {
  constructor(
    private readonly scheduleRepo: ScheduleBlocksRepository,
    private readonly eventLog: EventLogService,
  ) {}

  // Register event handlers on module initialization
  onModuleInit() {
    this.eventLog.registerHandler('task.deleted', async ({ task_id }) => {
      await this.handleTaskDeleted(task_id)
    })
  }

  // Handle task deletion event
  async handleTaskDeleted(taskId: string) {
    await this.scheduleRepo.deleteFutureBlocksForTask(
      taskId,
      new Date(),
    )
  }
}
