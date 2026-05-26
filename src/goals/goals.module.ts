import { Module } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GoalsRepository } from './goals.repo';
import { EventLogModule } from 'src/event-log/event-log.module';

@Module({
  imports: [PrismaModule, EventLogModule],
  controllers: [GoalsController],
  providers: [GoalsService, GoalsRepository],
  exports: [GoalsService], // needed later by scheduler / LLM jobs
})
export class GoalsModule {}
