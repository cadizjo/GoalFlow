// src/app.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { GoalsModule } from './goals/goals.module';
import { MilestonesModule } from './milestones/milestones.module';
import { TasksModule } from './tasks/tasks.module';
import { ScheduleBlocksModule } from './scheduling/scheduling.module';
import { EventLogModule } from './event-log/event-log.module';
import { buildThrottlerConfig } from './common/rate-limiting/throttler.config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppConfigModule } from './config/config.module';
import { AppConfigService } from './config/config.service';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    AppConfigModule,                   // Load and validate environment variables using AppConfigModule
    ThrottlerModule.forRootAsync({     // Configure ThrottlerModule asynchronously to use dynamic config values
      imports: [AppConfigModule], 
      inject: [AppConfigService], 
      useFactory: (config: AppConfigService) => buildThrottlerConfig(config), 
    }),
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
