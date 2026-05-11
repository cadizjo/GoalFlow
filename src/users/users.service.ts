import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { User, Prisma } from '@prisma/client'
import {
  assertEmailProvided,
  assertValidEmailFormat,
  normalizeEmail,
  assertPasswordHashExists,
  assertEmailImmutable,
} from './users.invariants'
import { handleInvariant } from '../common/errors/invariant-handler'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async user(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: userWhereUniqueInput,
    })
  }

  async users(params: {
    skip?: number
    take?: number
    cursor?: Prisma.UserWhereUniqueInput
    where?: Prisma.UserWhereInput
    orderBy?: Prisma.UserOrderByWithRelationInput
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params
    return this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    })
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    try {
      assertEmailProvided(data.email)
      assertValidEmailFormat(data.email)

      data.email = normalizeEmail(data.email)

      assertPasswordHashExists(data.password_hash)
    } catch (err) {
      handleInvariant(err)
    }

    return this.prisma.user.create({ data })
  }

  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput
    data: Prisma.UserUpdateInput
  }): Promise<User> {
    const { where, data } = params

    try {
      assertEmailImmutable(data)
    } catch (err) {
      handleInvariant(err)
    }

    return this.prisma.user.update({
      data,
      where,
    })
  }

  async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<User> {
    return this.prisma.user.delete({
      where,
    })
  }
}