import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard) // Protect all routes in this controller with JWT authentication
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@Req() req) {
    return this.usersService.user({ id: req.user.userId });
  }

  @Patch('me')
  updateMe(
    @Req() req,
    @Body()
    data: {
      name?: string;
      timezone?: string;
      preferences?: Record<string, any>;
    },
  ) {
    return this.usersService.updateUser({
      where: { id: req.user.userId },
      data
    });
  }
}
