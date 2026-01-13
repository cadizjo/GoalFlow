import { IsString, IsOptional, IsInt, IsUUID, IsNumber } from 'class-validator';

export class CreateTaskDto {
  @IsUUID()
  goal_id: string;

  @IsOptional()
  @IsUUID()
  milestone_id?: string;

  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  @IsString()
  description: string;

  @IsInt()
  estimated_minutes: number;

  @IsOptional()
  @IsNumber()
  estimated_confidence?: number;

  @IsNumber()
  priority_score: number;
}
