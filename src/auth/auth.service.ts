import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { UsersService } from '../users/users.service'
import { AppConfigService } from '../config/config.service'
import { handleInvariant } from '../common/errors/invariant-handler'
import {
  assertPasswordStrength,
  assertPasswordValid,
  assertUserExists,
} from './auth.invariants'
import {
  assertValidEmail,
  assertUserNotAlreadyRegistered,
} from '../users/users.invariants'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async signup(email: string, password: string, name?: string) {
    try {
      assertValidEmail(email)
      assertPasswordStrength(password)
    } catch (err) {
      handleInvariant(err)
    }

    const existing = await this.usersService.findByEmail(email)
    try {
      assertUserNotAlreadyRegistered(existing)
    } catch (err) {
      handleInvariant(err)
    }

    const password_hash = await bcrypt.hash(password, this.config.bcryptRounds)
    const user = await this.usersService.createUser({ email, name, password_hash })

    return this.signToken(user.id, user.email)
  }

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

    return this.signToken(user!.id, user!.email)
  }

  async signToken(userId: string, email: string) {
    const payload = { sub: userId, email }
    return {
      access_token: await this.jwtService.signAsync(payload),
    }
  }
}