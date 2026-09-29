import { Module } from '@nestjs/common';
import { EventLogService } from './event-log.service';
import { EventLogController } from './event-log.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [EventLogService],
  controllers: [EventLogController],
  exports: [EventLogService], // important
})
export class EventLogModule {}
