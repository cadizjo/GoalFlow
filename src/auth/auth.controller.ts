import { Controller, Post, Body, Get, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { Throttle } from '@nestjs/throttler';
import { AUTH_THROTTLE } from '../common/rate-limiting/throttler.config';

// Apply a strict auth-specific throttle to all routes in this controller.
// Overrides the global 100 req/min limit with 10 req/min to protect against
// brute force on login and credential stuffing on signup.
// @Throttle(AUTH_THROTTLE)
@Controller('auth')
export class AuthController {

  // Inject AuthService to handle authentication logic
  constructor(private authService: AuthService) {}

  @Post('signup')
  signup(
    @Body() dto: SignupDto, // Extract email, password, and optional name from request body
  ) {
    return this.authService.signup(dto.email, dto.password, dto.name);
  }

  @Post('login')
  login(
    @Body() dto: LoginDto, // Extract email and password from request body
  ) {
    return this.authService.login(dto.email, dto.password);
  }

  // Protected route to get current user info
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req) { // Access the request object to get user info
    return req.user;
  }
}
