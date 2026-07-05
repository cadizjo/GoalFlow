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
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ScheduleBlocksService } from './scheduling.service'
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto'
import { UpdateScheduleBlockDto } from './dto/update-schedule-block.dto'

@Controller('schedule-blocks')
@UseGuards(JwtAuthGuard)
export class ScheduleBlocksController {
  constructor(private readonly service: ScheduleBlocksService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateScheduleBlockDto) {
    return this.service.create(req.user.userId, dto)
  }

  @Get()
  findAll(@Req() req) {
    return this.service.findAll(req.user.userId)
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateScheduleBlockDto) {
    return this.service.update(req.user.userId, id, dto)
  }

  @Post(':id/complete')
  complete(@Req() req, @Param('id') id: string) {
    return this.service.complete(req.user.userId, id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@Req() req, @Param('id') id: string) {
    return this.service.delete(req.user.userId, id)
  }
}