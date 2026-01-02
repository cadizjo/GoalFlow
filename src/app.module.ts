// src/app.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Load environment variables globally
    AuthModule,
    PrismaModule,
    UsersModule,
  ],
})
export class AppModule {}
