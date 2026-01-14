import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EventLogService } from './event-log.service';

@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventLogController {
  constructor(private service: EventLogService) {}

  // Get event logs for the authenticated user
  @Get()
  getMyEvents(@Req() req) {
    return this.service.findByUser(req.user.userId);
  }
}
