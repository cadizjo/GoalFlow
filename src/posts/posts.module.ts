// src/posts/posts.module.ts
import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule], // Import the PrismaModule to use its services
  providers: [PostsService], // Register the PostsService as a provider
  exports: [PostsService], // Export the PostsService so it can be used in other modules
})
export class PostsModule {}
