import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class PaginationDto {
  @IsOptional()
  @IsString()
  cursor?: string // ID of the last item from the previous page

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20
}