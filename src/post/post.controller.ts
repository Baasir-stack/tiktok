/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

// src/post/post.controller.ts
// src/post/post.controller.ts
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  Param,
  Query,
  BadRequestException,
  ParseUUIDPipe,
  ParseIntPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { PostService } from './post.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { videoMulterConfig } from 'src/config/multer-video.config';

import { Request } from 'express';
import { OptionalJwtAuthGuard } from 'src/common/guards/optional-jwt.guard';
import { CreatePostMetadataDto } from './dto/create-post-metadata.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  // Step 1: Upload video only (background upload)
  @UseGuards(JwtAuthGuard)
  @Post('upload-video')
  @UseInterceptors(FileInterceptor('video', videoMulterConfig))
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    console.log('file', file);
    if (!file) {
      throw new BadRequestException('Video file is required');
    }

    const user = req.user;
    console.log('file', file);

    const uploadResult = await this.postService.uploadVideoOnly(user, file);

    return {
      success: true,
      message: 'Video uploaded successfully',
      data: uploadResult,
    };
  }

  // Step 2: Create post with metadata (instant post creation)
  @UseGuards(JwtAuthGuard)
  @Post('create-with-video')
  async createPostWithVideo(
    @Body() dto: CreatePostMetadataDto,
    @Req() req: Request,
  ) {
    console.log('req.user', req.user);
    const user = req.user;
    const post = await this.postService.createPostWithUploadedVideo(user, dto);

    return {
      success: true,
      message: 'Post created successfully',
      data: post,
    };
  }

  // Alternative: Traditional single-step upload (for backward compatibility)
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('video', videoMulterConfig))
  async createPost(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreatePostMetadataDto,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }

    const user = req.user;
    const post = await this.postService.createTraditional(user, dto, file);

    return {
      success: true,
      message: 'Post created successfully',
      data: post,
    };
  }

  // Cancel/Discard uploaded video
  @UseGuards(JwtAuthGuard)
  @Delete('discard-video/:tempId')
  async discardUploadedVideo(
    @Param('tempId') tempId: string,
    @Req() req: Request,
  ) {
    const user = req.user;
    await this.postService.discardUploadedVideo(tempId, user.id);

    return {
      success: true,
      message: 'Video discarded successfully',
    };
  }

  // Get public posts feed - Fixed parameter order
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async getPublicPosts(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('hashtag') hashtag?: string,
    @Req() req?: Request,
  ) {
    const posts = await this.postService.getPublicPosts(
      page,
      limit,
      hashtag,
      req?.user?.id,
    );

    return {
      success: true,
      data: posts,
    };
  }

  // Get single post
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  async getPost(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const post = await this.postService.getPostById(id, req.user?.id);

    return {
      success: true,
      data: post,
    };
  }

  // Update post
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @UseInterceptors(FileInterceptor('video', videoMulterConfig))
  async updatePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const user = req.user;
    const post = await this.postService.update(id, user.id, dto, file);

    return {
      success: true,
      message: 'Post updated successfully',
      data: post,
    };
  }

  // Delete post
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deletePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const user = req.user;
    await this.postService.delete(id, user.id);

    return {
      success: true,
      message: 'Post deleted successfully',
    };
  }

  // Like/Unlike post
  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  async toggleLike(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const user = req.user;
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    const result = await this.postService.toggleLike(id, user.id);

    return {
      success: true,
      message: result.liked ? 'Post liked' : 'Post unliked',
      data: {
        liked: result.liked,
        likesCount: result.likesCount,
      },
    };
  }
}

// User posts controller
@Controller('users')
export class UserPostsController {
  constructor(private readonly postService: PostService) {}

  // Get all posts of a user
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/posts')
  async getUserPosts(
    @Param('id') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Req() req?: Request,
  ) {
    const posts = await this.postService.getUserPosts(
      userId,
      page,
      limit,
      req?.user?.id,
    );

    return {
      success: true,
      data: posts,
    };
  }
}
