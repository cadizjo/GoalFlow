import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repo';
import { TasksController } from './tasks.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventLogModule } from '../event-log/event-log.module';
import { ScheduleBlocksQueryModule } from 'src/scheduling/scheduling-query.module';
import { TasksGoalEventHandler } from './tasks.goal-events';
import { TasksMilestoneEventHandler } from './tasks.milestone-events';

@Module({
  imports: [
    PrismaModule, 
    EventLogModule,
    ScheduleBlocksQueryModule
  ],
  controllers: [
    TasksController
  ],
  providers: [
    TasksService, 
    TasksRepository,
    TasksGoalEventHandler,
    TasksMilestoneEventHandler
  ],
  exports: [
    TasksRepository
  ], // Exporting TasksRepository for use in SchedulingModule
})
export class TasksModule {}
