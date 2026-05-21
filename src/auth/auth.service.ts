import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { handleInvariant } from '../common/errors/invariant-handler';
import {
  assertPasswordStrength,
  assertPasswordValid,
  assertUserExists,
} from './auth.invariants';
import {
  assertValidEmail,
  assertUserNotAlreadyRegistered,
} from '../users/users.invariants';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // User signup method
  async signup(email: string, password: string, name?: string) {
    // Validate email format and password strength
    try {
      assertValidEmail(email)
      assertPasswordStrength(password)
    } catch (err) {
      handleInvariant(err)
    }

    // Ensure no existing user with this email
    const existing = await this.usersService.findByEmail(email)
    try {
      assertUserNotAlreadyRegistered(existing)
    } catch (err) {
      handleInvariant(err)
    }

    // Hash the password and create the user
    const password_hash = await bcrypt.hash(password, 10);
    const user = await this.usersService.createUser({ email, name, password_hash });

    return this.signToken(user.id, user.email);
  }

  // User login method
  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email)

    try {
      assertUserExists(user)
    } catch (err) {
      handleInvariant(err)
    }

    const valid = await bcrypt.compare(password, user!.password_hash!)
    try {
      assertPasswordValid(valid)
    } catch (err) {
      handleInvariant(err)
    }

    return this.signToken(user!.id, user!.email);
  }

  // Sign a JWT token for the given user
  async signToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}