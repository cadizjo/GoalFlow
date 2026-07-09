import { Module } from '@nestjs/common'
import { MilestonesService } from './milestones.service'
import { MilestonesController } from './milestones.controller'
import { MilestonesRepository } from './milestones.repo'
import { MilestonesGoalEventHandler } from './milestones.goal-events'
import { PrismaModule } from '../prisma/prisma.module'
import { EventLogModule } from '../event-log/event-log.module'

@Module({
  imports: [PrismaModule, EventLogModule],
  controllers: [MilestonesController],
  providers: [
    MilestonesService,
    MilestonesRepository,
    MilestonesGoalEventHandler,
  ],
})
export class MilestonesModule {}