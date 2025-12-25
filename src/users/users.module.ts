// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersController } from './users.controller';

@Module({
  imports: [PrismaModule], // Import the Prisma module to use its services
  providers: [UsersService], // Register the service as a provider
  controllers: [UsersController], // Register the controller
})
export class UsersModule {}
