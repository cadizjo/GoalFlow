import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type EventHandler = (payload: any) => Promise<void> | void

@Injectable()
export class EventLogService {
  private listeners: Record<string, EventHandler[]> = {} // Event listeners registry

  constructor(private prisma: PrismaService) {}

  // Register an event handler for a specific event type
  registerHandler(eventType: string, handler: EventHandler) {
    this.listeners[eventType] ??= []  // Initialize the listeners array for the event type if not present
    this.listeners[eventType].push(handler)  // Add the handler to the listeners array
  }

  // Log a new event for the user
  async log(userId: string, type: string, payload?: any) {
    await this.prisma.eventLog.create({
      data: {
        user_id: userId,
        type,
        payload,
      },
    });

    // Trigger registered handlers for the event type
    for (const handler of this.listeners[type] ?? []) {
      await handler(payload)
    }
  }

  // Retrieve event logs for a specific user
  findByUser(userId: string) {
    return this.prisma.eventLog.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }
}
