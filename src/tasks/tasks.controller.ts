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
import { TasksService } from './tasks.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { AddDependencyDto } from './dto/add-dependency.dto'
import { CompleteTaskDto } from './dto/complete-task.dto'

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(req.user.userId, dto)
  }

  @Get(':id')
  getById(@Req() req, @Param('id') id: string) {
    return this.tasksService.getById(req.user.userId, id)
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(req.user.userId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@Req() req, @Param('id') id: string) {
    return this.tasksService.delete(req.user.userId, id)
  }

  @Post(':id/complete')
  complete(@Req() req, @Param('id') id: string, @Body() dto: CompleteTaskDto) {
    return this.tasksService.complete(req.user.userId, id, dto.actual_minutes)
  }

  @Post(':id/dependencies')
  addDependency(@Req() req, @Param('id') id: string, @Body() dto: AddDependencyDto) {
    return this.tasksService.addDependency(req.user.userId, id, dto.depends_on_task_id)
  }

  @Delete(':id/dependencies/:dependsOnTaskId')
  @HttpCode(HttpStatus.OK)
  removeDependency(
    @Req() req,
    @Param('id') id: string,
    @Param('dependsOnTaskId') dependsOnTaskId: string,
  ) {
    return this.tasksService.removeDependency(req.user.userId, id, dependsOnTaskId)
  }
}