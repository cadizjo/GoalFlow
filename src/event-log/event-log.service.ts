import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventLogService {
  constructor(private prisma: PrismaService) {}

  // Log a new event for the user
  log(userId: string, type: string, payload?: any) {
    return this.prisma.eventLog.create({
      data: {
        user_id: userId,
        type,
        payload,
      },
    });
  }

  // Retrieve event logs for a specific user
  findByUser(userId: string) {
    return this.prisma.eventLog.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }
}
