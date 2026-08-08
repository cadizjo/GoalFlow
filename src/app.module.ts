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
import { defaultThrottlerConfig } from './common/rate-limiting/throttler.config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot(defaultThrottlerConfig), // Apply global rate limiting
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
  providers: [
    {
      provide: APP_GUARD, // Register a global guard
      useClass: ThrottlerGuard, // Use the ThrottlerGuard to enforce rate limits across the application
    }
  ],
})
export class AppModule {}
