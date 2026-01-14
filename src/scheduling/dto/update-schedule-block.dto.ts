import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduleBlockDto } from './create-schedule-block.dto';

// UpdateScheduleBlockDto extends CreateScheduleBlockDto with all fields optional
export class UpdateScheduleBlockDto extends PartialType( 
  CreateScheduleBlockDto, // base class dto
) {}
