import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateMilestoneDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sequence?: number;
}
