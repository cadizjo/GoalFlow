import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repo';
import { TasksController } from './tasks.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventLogModule } from '../event-log/event-log.module';

@Module({
  imports: [
    PrismaModule, 
    EventLogModule
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository],
})
export class TasksModule {}
