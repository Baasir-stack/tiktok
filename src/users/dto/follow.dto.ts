import { IsUUID, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class FollowUserDto {
  @IsUUID()
  userId: string;
}

export class FollowersQueryDto {
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  search?: string;
}

export class FollowStatusDto {
  @IsUUID()
  userId: string;
}

// Response DTOs
export class FollowResponseDto {
  success: boolean;
  message: string;
  followersCount?: number;
  followingCount?: number;
}

export class FollowerUserDto {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  isVerified: boolean;
  followedAt: Date;
  isFollowingBack?: boolean; // Does this user follow the current user back
}

export class FollowersListResponseDto {
  followers: FollowerUserDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class FollowStatsDto {
  followersCount: number;
  followingCount: number;
  postsCount: number;
  likesCount: number;
}
