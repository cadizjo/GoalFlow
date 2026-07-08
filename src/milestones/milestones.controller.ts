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
import { MilestonesService } from './milestones.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CreateMilestoneDto } from './dto/create-milestone.dto'
import { UpdateMilestoneDto } from './dto/update-milestone.dto'

@Controller()
@UseGuards(JwtAuthGuard)
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Post('goals/:goalId/milestones')
  create(
    @Req() req,
    @Param('goalId') goalId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.milestonesService.create(req.user.userId, goalId, dto)
  }

  @Get('goals/:goalId/milestones')
  findAll(@Req() req, @Param('goalId') goalId: string) {
    return this.milestonesService.findAllForGoal(req.user.userId, goalId)
  }

  @Patch('milestones/:id')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateMilestoneDto) {
    return this.milestonesService.update(req.user.userId, id, dto)
  }

  @Delete('milestones/:id')
  @HttpCode(HttpStatus.OK)
  remove(@Req() req, @Param('id') id: string) {
    return this.milestonesService.remove(req.user.userId, id)
  }
}