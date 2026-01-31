import { IsOptional, IsString, IsInt, IsNumber, IsEnum } from 'class-validator';
import { TaskStatus } from '@prisma/client';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  estimated_minutes?: number;

  @IsOptional()
  @IsInt()
  estimated_confidence?: number;

  @IsOptional()
  @IsNumber()
  priority_score?: number;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsNumber()
  actual_minutes?: number;
}
