import { Module } from '@nestjs/common';
import { ScheduleBlocksService } from './scheduling.service';
import { ScheduleBlocksController } from './scheduling.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ScheduleBlocksController],
  providers: [ScheduleBlocksService],
})
export class ScheduleBlocksModule {}
