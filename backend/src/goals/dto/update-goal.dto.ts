import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { GoalStatus } from '@prisma/client';

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;
}
