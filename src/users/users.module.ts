// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule], // Import the Prisma module to use its services
  providers: [UsersService], // Register the service as a provider
  exports: [UsersService], // Export the service so it can be used in other modules
})
export class UsersModule {}
