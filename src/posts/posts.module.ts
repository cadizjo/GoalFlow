// src/posts/posts.module.ts
import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PostsController } from './posts.controller';

@Module({
  imports: [PrismaModule], // Import the PrismaModule to use its services
  providers: [PostsService], // Register the PostsService as a provider
  controllers: [PostsController], // Register the PostsController
})
export class PostsModule {}
