import { IsNumber, IsPositive } from 'class-validator';

export class CompleteTaskDto {
  @IsNumber()
  @IsPositive()
  actual_minutes: number;
}
