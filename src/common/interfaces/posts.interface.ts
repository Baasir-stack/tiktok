import { PostStatus } from 'src/post/entities/post.entity';

export interface TempVideoUploadResponse {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  videoDuration?: number;
  createdAt: Date;
}

export interface PostResponse {
  id: string;
  caption?: string;
  videoUrlHigh: string;
  thumbnailUrl?: string;
  videoDuration?: number;
  videoWidth?: number;
  videoHeight?: number;
  videoFileSize?: number;
  hashtags: string[];
  allowComments: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  allowDownload: boolean;
  isPublic: boolean;
  status: PostStatus;
  publishedAt?: Date;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: Date;
  updatedAt: Date;
  user?: any; // Will be set by formatPostResponse
}
