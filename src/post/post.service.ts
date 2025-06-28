/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
// src/post/post.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post, PostStatus } from './entities/post.entity';
import { Repository, MoreThan, In } from 'typeorm';
import { CreatePostMetadataDto } from './dto/create-post-metadata.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { User } from 'src/users/entities/user.entity';
import {
  TempVideoUpload,
  TempVideoStatus,
} from './entities/temp-video-upload.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Like } from './entities/like.entity';
import {
  PostResponse,
  TempVideoUploadResponse,
} from 'src/common/interfaces/posts.interface';
import { UploadService } from 'src/common/services/upload.service';
import { promises as fs } from 'fs';
import { Follow } from 'src/users/entities/follow.entity';

// Define standardized response interface
interface ServiceResponse<T = any> {
  message: string;
  data: T;
}

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Follow)
    private followRepo: Repository<Follow>,
    @InjectRepository(Like)
    private likeRepo: Repository<Like>,
    @InjectRepository(TempVideoUpload)
    private tempVideoRepo: Repository<TempVideoUpload>,
    private uploadService: UploadService,
  ) {}

  // Step 1: Upload video only (background process)
  async uploadVideoOnly(
    user: User,
    file: Express.Multer.File,
  ): Promise<ServiceResponse<TempVideoUploadResponse>> {
    if (!file) {
      console.log('file not received in service');
      throw new BadRequestException('Video file is required');
    }

    try {
      // Upload video to cloudinary
      console.log('hi');
      const uploadResult = await this.uploadService.uploadVideoToCloudinary(
        file,
        'tiktok/posts/temp-videos',
      );

      // Store in temp table
      const tempVideo = this.tempVideoRepo.create({
        userId: user.id,
        user,
        videoUrl: uploadResult.url,
        publicId: uploadResult.public_id,
        localFilePath: file.path,
        status: TempVideoStatus.UPLOADED,
      });

      const savedTempVideo = await this.tempVideoRepo.save(tempVideo);

      console.log('savedTempVideo', savedTempVideo);

      // Return formatted response
      const responseData: TempVideoUploadResponse = {
        id: savedTempVideo.id,
        videoUrl: savedTempVideo.videoUrl,
        thumbnailUrl: savedTempVideo.thumbnailUrl,
        videoDuration: savedTempVideo.videoDuration,
        createdAt: savedTempVideo.createdAt,
      };

      return {
        message: 'Video uploaded successfully',
        data: responseData,
      };
    } catch (err) {
      if (file.path) {
        try {
          await fs.unlink(file.path);
          console.log(`Cleaned up local file: ${file.path}`);
        } catch (cleanupErr) {
          console.warn(
            `Failed to cleanup local file: ${file.path}`,
            cleanupErr,
          );
        }
      }
      throw new InternalServerErrorException('Failed to upload video');
    }
  }

  // Step 2: Create post with uploaded video
  async createPostWithUploadedVideo(
    user: User,
    dto: CreatePostMetadataDto,
  ): Promise<ServiceResponse<PostResponse>> {
    // Validate temp video exists and belongs to user
    const tempVideo = await this.tempVideoRepo.findOne({
      where: {
        id: dto.tempVideoId,
        userId: user.id,
        status: TempVideoStatus.UPLOADED,
      },
    });

    console.log('tempVideo', tempVideo);

    if (!tempVideo) {
      throw new NotFoundException(
        'Video not found or already used. Please upload video again.',
      );
    }

    // Check if video hasn't expired
    if (new Date() > tempVideo.expiresAt) {
      // CLEANUP EXPIRED VIDEO - Delete from all locations
      try {
        // 1. Delete from Cloudinary
        await this.uploadService.deleteAsset(tempVideo.publicId, 'video');

        // 2. Delete local file if it exists
        if (tempVideo.localFilePath) {
          try {
            await fs.unlink(tempVideo.localFilePath);
            console.log(`Deleted local file: ${tempVideo.localFilePath}`);
          } catch (fileErr) {
            console.warn(
              `Failed to delete local file: ${tempVideo.localFilePath}`,
              fileErr,
            );
          }
        }

        // 3. Delete from database
        await this.tempVideoRepo.delete(tempVideo.id);

        console.log(`Cleaned up expired video: ${tempVideo.id}`);
      } catch (cleanupErr) {
        console.error(
          `Failed to cleanup expired video ${tempVideo.id}:`,
          cleanupErr,
        );
        await this.tempVideoRepo.update(tempVideo.id, {
          status: TempVideoStatus.EXPIRED,
        });
      }

      throw new BadRequestException(
        'Video has expired and has been cleaned up. Please upload video again.',
      );
    }

    try {
      // Create the post
      const newPost = this.postRepo.create({
        ...dto,
        user,
        userId: user.id,
        videoUrlHigh: tempVideo.videoUrl,
        thumbnailUrl: tempVideo.thumbnailUrl,
        videoDuration: tempVideo.videoDuration,
        videoWidth: tempVideo.videoWidth,
        videoHeight: tempVideo.videoHeight,
        videoFileSize: tempVideo.videoFileSize,
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
        hashtags: dto.hashtags || [],
        allowComments: dto.allowComments ?? true,
        allowDuet: dto.allowDuet ?? true,
        allowStitch: dto.allowStitch ?? true,
        allowDownload: dto.allowDownload ?? true,
        isPublic: dto.isPublic ?? true,
      });

      const savedPost = await this.postRepo.save(newPost);

      // Mark temp video as used
      await this.tempVideoRepo.update(tempVideo.id, {
        status: TempVideoStatus.USED,
      });

      // Delete the temporary video from Cloudinary (optional - you might want to keep it)
      // await this.uploadService.deleteAsset(tempVideo.publicId, 'video');

      // Update user's posts count
      await this.userRepo.increment({ id: user.id }, 'postsCount', 1);

      return {
        message: 'Post created successfully',
        data: this.formatPostResponse(savedPost),
      };
    } catch (err) {
      console.error('Failed to create post:', err);
      throw new InternalServerErrorException('Failed to create post');
    }
  }

  // Traditional single-step creation (backward compatibility)
  async createTraditional(
    user: User,
    dto: CreatePostMetadataDto,
    file: Express.Multer.File,
  ): Promise<ServiceResponse<PostResponse>> {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }

    try {
      const { url: videoUrlHigh, public_id } =
        await this.uploadService.uploadVideoToCloudinary(file, 'posts/videos');

      const newPost = this.postRepo.create({
        ...dto,
        user,
        userId: user.id,
        videoUrlHigh,
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
        hashtags: dto.hashtags || [],
        allowComments: dto.allowComments ?? true,
        allowDuet: dto.allowDuet ?? true,
        allowStitch: dto.allowStitch ?? true,
        allowDownload: dto.allowDownload ?? true,
        isPublic: dto.isPublic ?? true,
      });

      const savedPost = await this.postRepo.save(newPost);
      await this.userRepo.increment({ id: user.id }, 'postsCount', 1);

      return {
        message: 'Post created successfully',
        data: this.formatPostResponse(savedPost),
      };
    } catch (err) {
      console.error('Failed to create post:', err);
      throw new InternalServerErrorException('Failed to create post');
    }
  }

  // Discard uploaded video
  async discardUploadedVideo(
    tempId: string,
    userId: string,
  ): Promise<ServiceResponse<null>> {
    const tempVideo = await this.tempVideoRepo.findOne({
      where: {
        id: tempId,
        userId,
        status: TempVideoStatus.UPLOADED,
      },
    });

    if (!tempVideo) {
      throw new NotFoundException('Video not found or already processed');
    }

    try {
      // Delete from cloudinary
      await this.uploadService.deleteAsset(tempVideo.publicId, 'video');

      // Mark as discarded
      await this.tempVideoRepo.update(tempId, {
        status: TempVideoStatus.DISCARDED,
      });

      return {
        message: 'Video discarded successfully',
        data: null,
      };
    } catch (err) {
      // Log error but don't throw - cleanup job will handle it
      console.error('Failed to delete video from cloudinary:', err);

      // Still mark as discarded
      await this.tempVideoRepo.update(tempId, {
        status: TempVideoStatus.DISCARDED,
      });

      return {
        message: 'Video discarded successfully',
        data: null,
      };
    }
  }

  // For You Feed - Personalized algorithm-based feed
  async getForYouFeed(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<
    ServiceResponse<{
      posts: PostResponse[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>
  > {
    const skip = (page - 1) * limit;

    try {
      // Get user's interaction history for personalization
      const userLikes = await this.likeRepo.find({
        where: { userId },
        relations: ['post'],
        take: 100,
      });

      const userInteractedPosts = userLikes
        .map((like) => like.post)
        .filter(Boolean);

      // Extract hashtags from user's interactions
      const interactedHashtags = new Set<string>();
      userInteractedPosts.forEach((post) => {
        if (post?.hashtags) {
          post.hashtags.forEach((tag) => interactedHashtags.add(tag));
        }
      });

      // Get posts from followed users
      const followedUsers = await this.followRepo.find({
        where: { followerId: userId },
        select: ['followingId'],
      });
      const followedUserIds = followedUsers.map((f) => f.followingId);

      const queryBuilder = this.postRepo
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.user', 'user')
        .where('post.isPublic = :isPublic', { isPublic: true })
        .andWhere('post.status = :status', { status: PostStatus.PUBLISHED })
        .andWhere('post.userId != :userId', { userId });

      // Algorithm scoring
      let algorithmScore = `(
        CASE 
          WHEN post.userId IN (:...followedUserIds) THEN 50
          ELSE 0
        END +
        (post.likesCount * 0.4 + post.commentsCount * 0.6 + post.sharesCount * 1.0) +
        (86400 - EXTRACT(EPOCH FROM (NOW() - post.createdAt)) / 86400) * 10
      )`;

      // Add hashtag scoring if user has interacted hashtags
      if (interactedHashtags.size > 0) {
        const hashtagConditions = Array.from(interactedHashtags)
          .map((tag, index) => {
            queryBuilder.setParameter(`hashtag${index}`, tag);
            return `(:hashtag${index} = ANY(post.hashtags))`;
          })
          .join(' OR ');

        algorithmScore = `(
          CASE 
            WHEN post.userId IN (:...followedUserIds) THEN 50
            ELSE 0
          END +
          CASE 
            WHEN ${hashtagConditions} THEN 30
            ELSE 0
          END +
          (post.likesCount * 0.4 + post.commentsCount * 0.6 + post.sharesCount * 1.0) +
          (86400 - EXTRACT(EPOCH FROM (NOW() - post.createdAt)) / 86400) * 10
        )`;
      }

      queryBuilder
        .addSelect(algorithmScore, 'algorithm_score')
        .orderBy('algorithm_score', 'DESC')
        .addOrderBy('post.createdAt', 'DESC')
        .skip(skip)
        .take(limit);

      if (followedUserIds.length > 0) {
        queryBuilder.setParameter('followedUserIds', followedUserIds);
      }

      const [posts, total] = await queryBuilder.getManyAndCount();

      // Track views
      if (posts.length > 0) {
        const postIds = posts.map((post) => post.id);
        await this.postRepo
          .createQueryBuilder()
          .update(Post)
          .set({
            viewsCount: () => 'viewsCount + 1',
            lastInteractionAt: new Date(),
          })
          .where('id IN (:...postIds)', { postIds })
          .execute();
      }

      return {
        message: 'For you feed retrieved successfully',
        data: {
          posts: posts.map((post) => this.formatPostResponse(post)),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (err) {
      console.error('Failed to get for you feed:', err);
      throw new InternalServerErrorException('Failed to retrieve for you feed');
    }
  }

  // Following Feed - Posts from users you follow
  async getFollowingFeed(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<
    ServiceResponse<{
      posts: PostResponse[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>
  > {
    const skip = (page - 1) * limit;

    try {
      // Get followed users
      const followedUsers = await this.followRepo.find({
        where: { followerId: userId },
        select: ['followingId'],
      });

      if (followedUsers.length === 0) {
        return {
          message: 'Following feed retrieved successfully',
          data: {
            posts: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
          },
        };
      }

      const followedUserIds = followedUsers.map((f) => f.followingId);

      const [posts, total] = await this.postRepo.findAndCount({
        where: {
          userId: In(followedUserIds),
          isPublic: true,
          status: PostStatus.PUBLISHED,
        },
        relations: ['user'],
        order: {
          createdAt: 'DESC',
        },
        skip,
        take: limit,
      });

      // Track views
      if (posts.length > 0) {
        const postIds = posts.map((post) => post.id);
        await this.postRepo
          .createQueryBuilder()
          .update(Post)
          .set({
            viewsCount: () => 'viewsCount + 1',
            lastInteractionAt: new Date(),
          })
          .where('id IN (:...postIds)', { postIds })
          .execute();
      }

      return {
        message: 'Following feed retrieved successfully',
        data: {
          posts: posts.map((post) => this.formatPostResponse(post)),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (err) {
      console.error('Failed to get following feed:', err);
      throw new InternalServerErrorException(
        'Failed to retrieve following feed',
      );
    }
  }

  // Cleanup expired/unused videos (runs every hour)
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredVideos(): Promise<void> {
    try {
      const expiredVideos = await this.tempVideoRepo.find({
        where: [
          { status: TempVideoStatus.UPLOADED, expiresAt: MoreThan(new Date()) },
          { status: TempVideoStatus.DISCARDED },
        ],
      });

      for (const video of expiredVideos) {
        try {
          // Delete from cloudinary
          await this.uploadService.deleteAsset(video.publicId, 'video');

          // Delete local file if it exists
          if (video.localFilePath) {
            try {
              await fs.unlink(video.localFilePath);
              console.log(`Deleted local file: ${video.localFilePath}`);
            } catch (fileErr) {
              console.warn(
                `Failed to delete local file: ${video.localFilePath}`,
                fileErr,
              );
            }
          }

          // Delete from database
          await this.tempVideoRepo.delete(video.id);
        } catch (err) {
          console.error(`Failed to cleanup video ${video.id}:`, err);
        }
      }

      console.log(`Cleaned up ${expiredVideos.length} expired videos`);
    } catch (err) {
      console.error('Cleanup job failed:', err);
    }
  }

  async getPublicPosts(
    page: number = 1,
    limit: number = 10,
    hashtag?: string,
    viewerId?: string,
  ): Promise<
    ServiceResponse<{
      posts: PostResponse[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>
  > {
    const skip = (page - 1) * limit;

    try {
      const queryBuilder = this.postRepo
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.user', 'user')
        .where('post.isPublic = :isPublic', { isPublic: true })
        .andWhere('post.status = :status', { status: PostStatus.PUBLISHED })
        .orderBy('post.createdAt', 'DESC')
        .skip(skip)
        .take(limit);

      if (hashtag) {
        queryBuilder.andWhere(':hashtag = ANY(post.hashtags)', { hashtag });
      }

      const [posts, total] = await queryBuilder.getManyAndCount();

      if (viewerId && posts.length > 0) {
        const postIds = posts.map((post) => post.id);
        await this.postRepo
          .createQueryBuilder()
          .update(Post)
          .set({ viewsCount: () => 'viewsCount + 1' })
          .where('id IN (:...postIds)', { postIds })
          .execute();
      }

      return {
        message: 'Public posts retrieved successfully',
        data: {
          posts: posts.map((post) => this.formatPostResponse(post)),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (err) {
      console.error('Failed to get public posts:', err);
      throw new InternalServerErrorException('Failed to retrieve public posts');
    }
  }

  async getPostById(
    id: string,
    viewerId?: string,
  ): Promise<ServiceResponse<PostResponse>> {
    try {
      const post = await this.postRepo.findOne({
        where: { id },
        relations: ['user'],
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      if (!post.isPublic && (!viewerId || post.userId !== viewerId)) {
        throw new ForbiddenException('Post is private');
      }

      if (viewerId && post.userId !== viewerId) {
        await this.postRepo.increment({ id }, 'viewsCount', 1);
        post.viewsCount += 1;
      }

      return {
        message: 'Post retrieved successfully',
        data: this.formatPostResponse(post),
      };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      console.error('Failed to get post by id:', err);
      throw new InternalServerErrorException('Failed to retrieve post');
    }
  }

  async getUserPosts(
    userId: string,
    page: number = 1,
    limit: number = 10,
    viewerId?: string,
  ): Promise<
    ServiceResponse<{
      posts: PostResponse[];
      user: any;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>
  > {
    const skip = (page - 1) * limit;

    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const queryBuilder = this.postRepo
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.user', 'user')
        .where('post.userId = :userId', { userId })
        .andWhere('post.status = :status', { status: PostStatus.PUBLISHED });

      if (viewerId !== userId) {
        queryBuilder.andWhere('post.isPublic = :isPublic', { isPublic: true });
      }

      const [posts, total] = await queryBuilder
        .orderBy('post.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      return {
        message: 'User posts retrieved successfully',
        data: {
          posts: posts.map((post) => this.formatPostResponse(post)),
          user: user.toPublicProfile(),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      console.error('Failed to get user posts:', err);
      throw new InternalServerErrorException('Failed to retrieve user posts');
    }
  }

  async update(
    id: string,
    userId: string,
    dto: UpdatePostDto,
    file?: Express.Multer.File,
  ): Promise<ServiceResponse<PostResponse>> {
    try {
      const post = await this.postRepo.findOne({
        where: { id },
        relations: ['user'],
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      if (post.user.id !== userId) {
        throw new ForbiddenException(
          'You are not authorized to update this post',
        );
      }

      const updateData: Partial<Post> = { ...dto };

      if (file) {
        const { url: videoUrlHigh } =
          await this.uploadService.uploadVideoToCloudinary(
            file,
            'posts/videos',
          );
        updateData.videoUrlHigh = videoUrlHigh;
      }

      await this.postRepo.update(id, updateData);
      const updatedPost = await this.getPostById(id, userId);

      return {
        message: 'Post updated successfully',
        data: updatedPost.data,
      };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      console.error('Failed to update post:', err);
      throw new InternalServerErrorException('Failed to update post');
    }
  }

  async delete(id: string, userId: string): Promise<ServiceResponse<null>> {
    try {
      const post = await this.postRepo.findOne({
        where: { id, userId },
      });

      if (!post) {
        throw new NotFoundException('Post not found or unauthorized');
      }

      await this.postRepo.delete(id);
      await this.userRepo.decrement({ id: userId }, 'postsCount', 1);

      return {
        message: 'Post deleted successfully',
        data: null,
      };
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      console.error('Failed to delete post:', err);
      throw new InternalServerErrorException('Failed to delete post');
    }
  }

  async toggleLike(
    postId: string,
    userId: string,
  ): Promise<
    ServiceResponse<{
      liked: boolean;
      likesCount: number;
    }>
  > {
    try {
      const post = await this.postRepo.findOne({ where: { id: postId } });
      if (!post) {
        throw new NotFoundException('Post not found');
      }

      const existingLike = await this.likeRepo.findOne({
        where: { postId, userId },
      });

      if (existingLike) {
        await this.likeRepo.delete({ postId, userId });
        await this.postRepo.decrement({ id: postId }, 'likesCount', 1);

        return {
          message: 'Post unliked successfully',
          data: {
            liked: false,
            likesCount: Math.max(0, post.likesCount - 1),
          },
        };
      } else {
        const like = this.likeRepo.create({ postId, userId });
        await this.likeRepo.save(like);
        await this.postRepo.increment({ id: postId }, 'likesCount', 1);

        return {
          message: 'Post liked successfully',
          data: {
            liked: true,
            likesCount: post.likesCount + 1,
          },
        };
      }
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      console.error('Failed to toggle like:', err);
      throw new InternalServerErrorException('Failed to toggle like');
    }
  }

  private formatPostResponse(post: Post): PostResponse {
    return {
      id: post.id,
      videoUrlHigh: post.videoUrlHigh,
      thumbnailUrl: post.thumbnailUrl,
      videoDuration: post.videoDuration,
      videoWidth: post.videoWidth,
      videoHeight: post.videoHeight,
      videoFileSize: post.videoFileSize,
      hashtags: post.hashtags,
      allowComments: post.allowComments,
      allowDuet: post.allowDuet,
      allowStitch: post.allowStitch,
      allowDownload: post.allowDownload,
      isPublic: post.isPublic,
      status: post.status,
      publishedAt: post.publishedAt,
      viewsCount: post.viewsCount,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      sharesCount: post.sharesCount,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      caption: post.caption,
      user: post.user ? post.user.toPublicProfile() : null,
    };
  }
}
