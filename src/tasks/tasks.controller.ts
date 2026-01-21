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
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AddDependencyDto } from './dto/add-dependency.dto';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // Create a new task
  @Post()
  create(@Req() req, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(req.user.userId, dto);
  }

  // Get task by ID
  @Get(':id')
  getById(@Req() req, @Param('id') id: string) {
    return this.tasksService.getById(req.user.userId, id);
  }

  // Update task by ID
  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(req.user.userId, id, dto);
  }

  // Delete task by ID
  @Delete(':id')
  delete(@Req() req, @Param('id') id: string) {
    return this.tasksService.delete(req.user.userId, id);
  }

  // Mark task as complete by ID
  @Post(':id/complete')
  complete(
    @Req() req,
    @Param('id') id: string,
    @Body() body: { actualMinutes: number }, // receive actualMinutes in the body
  ) {
    return this.tasksService.complete(
      req.user.userId,
      id,
      body.actualMinutes,
    )
  }

  // Add a dependency to a task
  @Post(':id/dependencies')
  addDependency(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: AddDependencyDto,
  ) {
    return this.tasksService.addDependency(
      req.user.userId,
      id,
      dto.dependsOnTaskId,
    );
  }

  // Remove a dependency from a task
  @Delete(':id/dependencies/:dependsOnTaskId')
  removeDependency(
    @Req() req,
    @Param('id') id: string,
    @Param('dependsOnTaskId') dependsOnTaskId: string,
  ) {
    return this.tasksService.removeDependency(
      req.user.userId,
      id,
      dependsOnTaskId,
    );
  }
}
