import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ScheduleSource, ScheduleStatus } from '@prisma/client';

export class UpdateScheduleBlockDto {
  @IsOptional()
  @IsDateString()
  start_time?: string;

  @IsOptional()
  @IsDateString()
  end_time?: string;

  @IsOptional()
  @IsEnum(ScheduleSource)
  source?: ScheduleSource;

  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;

  @IsOptional()
  @IsDateString()
  completed_at?: string;
}