// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Make the module global so that it can be injected anywhere in the application
@Module({
  providers: [PrismaService], // Register the PrismaService as a provider
  exports: [PrismaService], // Export the PrismaService so that it can be used in other modules
})
export class PrismaModule {}
