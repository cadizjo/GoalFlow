import { IsUUID, IsDateString, IsEnum } from 'class-validator';
import { ScheduleSource, ScheduleStatus } from '@prisma/client';

export class CreateScheduleBlockDto {
  @IsUUID()
  task_id: string;

  @IsDateString()
  start_time: string;

  @IsDateString()
  end_time: string;

  @IsEnum(ScheduleSource)
  source: ScheduleSource;
}
