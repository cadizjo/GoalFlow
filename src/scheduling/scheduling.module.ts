import { Module } from '@nestjs/common';
import { ScheduleBlocksService } from './scheduling.service';
import { ScheduleBlocksController } from './scheduling.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventLogModule } from 'src/event-log/event-log.module';
import { ScheduleBlocksRepository } from './scheduling.repo';
import { TasksModule } from 'src/tasks/tasks.module';

@Module({
  imports: [
    PrismaModule, 
    EventLogModule,
    TasksModule
  ],
  controllers: [ScheduleBlocksController],
  providers: [ScheduleBlocksService, ScheduleBlocksRepository],
})
export class ScheduleBlocksModule {}
