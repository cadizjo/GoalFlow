import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {

  // Inject AuthService to handle authentication logic
  constructor(private authService: AuthService) {}

  @Post('signup')
  signup(
    @Body() body: { email: string; password: string; name?: string }, // Extract email, password, and optional name from request body
  ) {
    return this.authService.signup(body.email, body.password, body.name);
  }

  @Post('login')
  login(
    @Body() body: { email: string; password: string }, // Extract email and password from request body
  ) {
    return this.authService.login(body.email, body.password);
  }

  // Protected route to get current user info
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req) { // Access the request object to get user info
    return req.user;
  }
}
