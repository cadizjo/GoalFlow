import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../users/users.repo';
import {
  assertValidEmail,
  assertPasswordStrength,
  assertUserNotAlreadyRegistered,
  assertUserExists,
  assertPasswordValid,
} from './auth.invariants';
import { handleInvariant } from '../common/errors/invariant-handler';

@Injectable()
export class AuthService {
  constructor(
    private usersRepository: UsersRepository,
    private jwtService: JwtService,
  ) {}

  // User signup method
  async signup(email: string, password: string, name?: string) {
    // Validate email and password format
    try {
      assertValidEmail(email)
      assertPasswordStrength(password)
    } catch (err) {
      handleInvariant(err)
    }

    // Ensure no existing user with this email
    const existing = await this.usersRepository.findUnique({ email })
    try {
      assertUserNotAlreadyRegistered(existing)
    } catch (err) {
      handleInvariant(err)
    }

    // Hash the password and create the user
    const password_hash = await bcrypt.hash(password, 10);
    const user = await this.usersRepository.create({ email, name, password_hash });

    return this.signToken(user.id, user.email);
  }

  // User login method
  async login(email: string, password: string) {
    const user = await this.usersRepository.findUnique({ email });

    // Validate user exists and password is correct
    try {
      assertUserExists(user)
    } catch (err) {
      handleInvariant(err)
    }

    // Compare provided password with stored hash
    const valid = await bcrypt.compare(password, user!.password_hash!); 
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