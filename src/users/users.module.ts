import { Module } from '@nestjs/common';
import { UsersRepository } from './users.repo';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersController } from './users.controller';
import { EventLogModule } from 'src/event-log/event-log.module';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule, EventLogModule], // Import the Prisma module to use its services
  providers: [UsersRepository, UsersService], // Register the repository and service as providers
  controllers: [UsersController], // Register the controller
  exports: [UsersRepository, UsersService], // needed by AuthModule
})
export class UsersModule {}
