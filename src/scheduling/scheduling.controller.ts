import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ScheduleBlocksService } from './scheduling.service';
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto';
import { UpdateScheduleBlockDto } from './dto/update-schedule-block.dto';

@UseGuards(JwtAuthGuard)
@Controller('schedule-blocks')
export class ScheduleBlocksController {
  constructor(private service: ScheduleBlocksService) {}

  // Create a new schedule block
  @Post()
  create(@Req() req, @Body() dto: CreateScheduleBlockDto) {
    return this.service.create(req.user.userId, dto);
  }

  // Get all schedule blocks for the user
  @Get()
  findAll(@Req() req) {
    return this.service.findAll(req.user.userId);
  }

  // Update a schedule block by ID
  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleBlockDto,
  ) {
    return this.service.update(req.user.userId, id, dto);
  }

  // Delete a schedule block by ID
  @Delete(':id')
  delete(@Req() req, @Param('id') id: string) {
    return this.service.delete(req.user.userId, id);
  }
}
