import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { UpdateUserDto } from './dto/update-user.dto'
import { ChangePasswordDto } from './dto/change-password.dto'

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── GET /users/me ─────────────────────────────────────────────────────────

  @Get('me')
  getMe(@Req() req) {
    return this.usersService.getMe(req.user.userId)
  }

  // ─── PATCH /users/me ───────────────────────────────────────────────────────

  @Patch('me')
  updateMe(@Req() req, @Body() dto: UpdateUserDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('No fields provided for update')
    }

    return this.usersService.updateMe(req.user.userId, dto)
  }

  // ─── PATCH /users/me/password ──────────────────────────────────────────────

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(
      req.user.userId,
      dto.current_password,
      dto.new_password,
    )
  }

  // ─── DELETE /users/me ──────────────────────────────────────────────────────

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  deleteMe(@Req() req) {
    return this.usersService.deleteMe(req.user.userId)
  }
}