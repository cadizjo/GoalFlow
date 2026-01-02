import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

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
