import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  Delete,
} from '@nestjs/common';
import { UsersRepository } from './users.repo';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard) // Protect all routes in this controller with JWT authentication
export class UsersController {
  constructor(private usersRepository: UsersRepository) {}

  @Get('me')
  getMe(@Req() req) {
    return this.usersRepository.user({ id: req.user.userId });
  }

  @Patch('me')
  updateMe(
    @Req() req,
    @Body() dto: UpdateUserDto,
  ) {
    if (Object.keys(dto).length === 0) { // Check if any fields are provided for update
      throw new BadRequestException('No fields provided for update');
    }

    return this.usersRepository.updateUser({
      where: { id: req.user.userId },
      data: dto
    });
  }

  @Delete('me')
  deleteMe(@Req() req) {
    return this.usersRepository.deleteUser({ id: req.user.userId });
  }
}
