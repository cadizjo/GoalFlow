import { IsNumber } from 'class-validator';

export class CompleteTaskDto {
  @IsNumber()
  actual_minutes: number;
}
