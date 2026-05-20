import { Module } from '@nestjs/common';
import { UsersRepository } from './users.repo';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersController } from './users.controller';

@Module({
  imports: [PrismaModule], // Import the Prisma module to use its services
  providers: [UsersRepository], // Register the repository as a provider
  controllers: [UsersController], // Register the controller
  exports: [UsersRepository], // needed by AuthModule
})
export class UsersModule {}
