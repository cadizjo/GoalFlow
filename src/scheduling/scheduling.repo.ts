// src/scheduling/scheduling.repo.ts
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto'
import { Prisma, ScheduleBlock, ScheduleStatus } from '@prisma/client'
import { UpdateScheduleBlockDto } from './dto/update-schedule-block.dto'

@Injectable()
export class ScheduleBlocksRepository {
  constructor(private prisma: PrismaService) {}

  create(userId: string, data: CreateScheduleBlockDto): Promise<ScheduleBlock> {
    return this.prisma.scheduleBlock.create({ 
      data: { user_id: userId, ...data } 
    })
  }

  findById(id: string): Promise<ScheduleBlock | null> {
    return this.prisma.scheduleBlock.findUnique({ where: { id } })
  }

  findAllByUser(userId: string): Promise<ScheduleBlock[]> {
    return this.prisma.scheduleBlock.findMany({
      where: { user_id: userId },
      orderBy: { start_time: 'asc' },
    })
  }

  update(id: string, data: UpdateScheduleBlockDto): Promise<ScheduleBlock> {
    return this.prisma.scheduleBlock.update({
      where: { id },
      data,
    })
  }

  delete(id: string): Promise<ScheduleBlock> {
    return this.prisma.scheduleBlock.delete({ where: { id } })
  }

  countOverlaps(
    userId: string,
    start: Date, // e.g. 10:00 AM
    end: Date, // e.g. 11:00 AM
    excludeId?: string, // optional ID to exclude from overlap check
  ): Promise<number> {
    return this.prisma.scheduleBlock.count({
      where: {
        user_id: userId,
        id: excludeId ? { not: excludeId } : undefined,
        start_time: { lt: end }, // e.g. 9:30 AM < 11:00 AM
        end_time: { gt: start }, // e.g. 10:30 AM > 10:00 AM
      },
    })
  }

  countByTaskId(taskId: string): Promise<number> {
    return this.prisma.scheduleBlock.count({
      where: { task_id: taskId },
    })
  }

  /*
  * Task-related scheduling operations
  */

  // Delete all future scheduled blocks for a task
  deleteFutureBlocksForTask(taskId: string, now: Date) {
    return this.prisma.scheduleBlock.deleteMany({
      where: {
        task_id: taskId,
        status: ScheduleStatus.scheduled,
        start_time: { gt: now },
      },
    })
  }
}
