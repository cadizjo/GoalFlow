// src/app.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { AppController } from './app.controller';
import { UsersController } from './users/users.controller';
import { PostsController } from './posts/posts.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Load environment variables globally
    UsersModule,
    PostsModule,
  ],
  controllers: [AppController, UsersController, PostsController],
})
export class AppModule {}
