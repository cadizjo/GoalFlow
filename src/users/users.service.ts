import {
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { UsersRepository } from './users.repo'
import { UpdateUserDto } from './dto/update-user.dto'
import { EventLogService } from '../event-log/event-log.service'
import { handleInvariant } from '../common/errors/invariant-handler'
import {
  assertValidEmail,
  assertUserNotAlreadyRegistered,
  assertNameNotEmpty,
  assertNameLength,
  assertNewPasswordDiffersFromCurrent,
} from './users.invariants'
import {
  assertPasswordStrength,
  assertPasswordValid,
} from '../auth/auth.invariants'

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly eventLog: EventLogService,
  ) {}

  // ─── Queries ───────────────────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.repo.findUnique({ id: userId })
    if (!user) throw new NotFoundException('User not found')
    return this.stripSensitiveFields(user)
  }

  // ─── Mutations ─────────────────────────────────────────────────────────────

  async updateMe(userId: string, dto: UpdateUserDto) {
    const user = await this.repo.findUnique({ id: userId })
    if (!user) throw new NotFoundException('User not found')

    // Validate name if provided
    if (dto.name !== undefined) {
      try {
        assertNameNotEmpty(dto.name)
        assertNameLength(dto.name)
      } catch (err) {
        handleInvariant(err)
      }
    }

    // Validate email format and uniqueness if being changed
    if (dto.email !== undefined && dto.email !== user.email) {
      try {
        assertValidEmail(dto.email)
      } catch (err) {
        handleInvariant(err)
      }

      const existing = await this.repo.findUnique({ email: dto.email })
      try {
        assertUserNotAlreadyRegistered(existing)
      } catch (err) {
        handleInvariant(err)
      }
    }

    const updated = await this.repo.update({ id: userId }, dto)

    await this.eventLog.log(userId, 'user.updated', {
      user_id: userId,
      changed_fields: Object.keys(dto),
    })

    return this.stripSensitiveFields(updated)
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.repo.findUnique({ id: userId })
    if (!user) throw new NotFoundException('User not found')

    // Validate new password strength
    try {
      assertPasswordStrength(newPassword)
    } catch (err) {
      handleInvariant(err)
    }

    // Ensure new password differs from current
    try {
      assertNewPasswordDiffersFromCurrent(currentPassword, newPassword)
    } catch (err) {
      handleInvariant(err)
    }

    // Verify current password is correct
    const valid = await bcrypt.compare(currentPassword, user.password_hash!)
    try {
      assertPasswordValid(valid)
    } catch (err) {
      handleInvariant(err)
    }

    const password_hash = await bcrypt.hash(newPassword, 10)
    await this.repo.update({ id: userId }, { password_hash })

    await this.eventLog.log(userId, 'user.password_changed', {
      user_id: userId,
    })
  }

  async deleteMe(userId: string) {
    const user = await this.repo.findUnique({ id: userId })
    if (!user) throw new NotFoundException('User not found')

    await this.repo.delete({ id: userId })

    await this.eventLog.log(userId, 'user.deleted', {
      user_id: userId,
    })
  }

  // ─── Used by AuthService ───────────────────────────────────────────────────

  async findByEmail(email: string) {
    return this.repo.findUnique({ email })
  }

  async findById(id: string) {
    return this.repo.findUnique({ id })
  }

  async createUser(data: { email: string; name?: string; password_hash: string }) {
    return this.repo.create(data)
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private stripSensitiveFields(user: Record<string, any>) {
    const { password_hash, ...safe } = user
    return safe
  }
}