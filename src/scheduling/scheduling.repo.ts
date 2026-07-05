import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto'
import { ScheduleBlock, ScheduleStatus } from '@prisma/client'
import { UpdateScheduleBlockDto } from './dto/update-schedule-block.dto'

@Injectable()
export class ScheduleBlocksRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  create(userId: string, data: CreateScheduleBlockDto): Promise<ScheduleBlock> {
    return this.prisma.scheduleBlock.create({
      data: { user_id: userId, ...data },
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
    return this.prisma.scheduleBlock.update({ where: { id }, data })
  }

  delete(id: string): Promise<ScheduleBlock> {
    return this.prisma.scheduleBlock.delete({ where: { id } })
  }

  // ─── Overlap detection ─────────────────────────────────────────────────────

  countOverlaps(
    userId: string,
    start: Date,
    end: Date,
    excludeId?: string,
  ): Promise<number> {
    return this.prisma.scheduleBlock.count({
      where: {
        user_id: userId,
        id: excludeId ? { not: excludeId } : undefined,
        start_time: { lt: end },
        end_time: { gt: start },
      },
    })
  }

  // ─── Task-related operations ───────────────────────────────────────────────

  countByTaskId(taskId: string): Promise<number> {
    return this.prisma.scheduleBlock.count({
      where: { task_id: taskId },
    })
  }

  // Delete all non-completed future schedule blocks for a task
  deleteFutureBlocksForTask(taskId: string, now: Date) {
    return this.prisma.scheduleBlock.deleteMany({
      where: {
        task_id: taskId,
        status: { not: ScheduleStatus.completed },
        start_time: { gt: now },
      },
    })
  }
}