// src/app.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { GoalsModule } from './goals/goals.module';
import { MilestonesModule } from './milestones/milestones.module';
import { TasksModule } from './tasks/tasks.module';
import { ScheduleBlocksModule } from './scheduling/scheduling.module';
import { EventLogModule } from './event-log/event-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Load environment variables globally
    PrismaModule,
    AuthModule,
    UsersModule,
    GoalsModule,
    MilestonesModule,
    TasksModule,
    ScheduleBlocksModule,
    EventLogModule,
  ],
})
export class AppModule {}
