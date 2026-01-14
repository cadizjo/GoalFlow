import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduleBlocksService {
  constructor(private prisma: PrismaService) {}

  // Create a new schedule block for the user
  create(userId: string, data: any) {
    return this.prisma.scheduleBlock.create({
      data: {
        ...data,
        user_id: userId,
      },
    });
  }

  // Get all schedule blocks for the user
  findAll(userId: string) {
    return this.prisma.scheduleBlock.findMany({
      where: { user_id: userId },
      orderBy: { start_time: 'asc' },
    });
  }

  // Update a schedule block after verifying ownership
  async update(userId: string, id: string, data: any) {
    const block = await this.prisma.scheduleBlock.findUnique({ where: { id } });
    if (!block || block.user_id !== userId) {
      throw new ForbiddenException();
    }

    return this.prisma.scheduleBlock.update({
      where: { id },
      data,
    });
  }

  // Delete a schedule block after verifying ownership
  async delete(userId: string, id: string) {
    const block = await this.prisma.scheduleBlock.findUnique({ where: { id } });
    if (!block || block.user_id !== userId) {
      throw new ForbiddenException();
    }

    return this.prisma.scheduleBlock.delete({ where: { id } });
  }
}
