// src/posts/posts.controller.ts
import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { Post as PostModel } from 'src/generated/prisma/client';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get(':id')
  getPostById(@Param('id') id: string): Promise<PostModel | null> {
    return this.postsService.post({ id: Number(id) });
  }

  @Get()
  getPublishedPosts(): Promise<PostModel[]> {
    return this.postsService.posts({
      where: { published: true },
    });
  }

  @Get('search/:searchString')
  getFilteredPosts(
    @Param('searchString') searchString: string,
  ): Promise<PostModel[]> {
    return this.postsService.posts({
      where: {
        OR: [
          { title: { contains: searchString } },
          { content: { contains: searchString } },
        ],
      },
    });
  }

  @Post()
  createDraft(
    @Body() postData: { title: string; content?: string; authorEmail: string },
  ): Promise<PostModel> {
    const { title, content, authorEmail } = postData;
    return this.postsService.createPost({
      title,
      content,
      author: { connect: { email: authorEmail } },
    });
  }

  @Put('publish/:id')
  publishPost(@Param('id') id: string): Promise<PostModel> {
    return this.postsService.updatePost({
      where: { id: Number(id) },
      data: { published: true },
    });
  }

  @Delete(':id')
  deletePost(@Param('id') id: string): Promise<PostModel> {
    return this.postsService.deletePost({ id: Number(id) });
  }
}
