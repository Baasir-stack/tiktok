// src/post/post.module.ts
import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController, UserPostsController } from './post.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { UploadModule } from 'src/upload/upload.module';
import { Like } from './entities/like.entity';
import { TempVideoUpload } from './entities/temp-video-upload.entity';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      Like,
      TempVideoUpload,
      User, // Add User entity here
    ]),
    UploadModule,
  ],
  controllers: [PostController, UserPostsController], // Don't forget UserPostsController
  providers: [PostService],
  exports: [PostService], // Export if other modules need it
})
export class PostModule {}
