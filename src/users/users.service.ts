import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Follow } from './entities/follow.entity';
import { Repository, DataSource } from 'typeorm'; // Add DataSource import
import { InjectRepository } from '@nestjs/typeorm';
import {
  FollowResponseDto,
  FollowersQueryDto,
  FollowersListResponseDto,
  FollowerUserDto,
  FollowStatsDto,
} from './dto/follow.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Follow)
    private followRepository: Repository<Follow>,
    @InjectRepository(User) // Add User repository
    private userRepository: Repository<User>,
    private dataSource: DataSource, // Add DataSource injection
  ) {}

  // Add the missing findById method
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  // Add updateUser method (if you don't have it already)
  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    await this.userRepository.update(id, updateData);
    const updatedUser = await this.findById(id);
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    return updatedUser;
  }

  async followUser(
    followerId: string,
    followingId: string,
  ): Promise<FollowResponseDto> {
    // Prevent self-follow
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    // Check if both users exist and are active
    const [follower, following] = await Promise.all([
      this.findById(followerId),
      this.findById(followingId),
    ]);

    if (!follower || !following) {
      throw new NotFoundException('User not found');
    }

    if (!follower.canInteract() || !following.canInteract()) {
      throw new BadRequestException('Cannot follow this user');
    }

    // Check if already following
    const existingFollow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    if (existingFollow) {
      throw new BadRequestException('You are already following this user');
    }

    // Create follow relationship
    await this.dataSource.transaction(async (manager) => {
      // Create follow record
      const follow = manager.create(Follow, {
        followerId,
        followingId,
      });
      await manager.save(follow);

      // Update counters
      await manager.increment(User, { id: followerId }, 'followingCount', 1);
      await manager.increment(User, { id: followingId }, 'followersCount', 1);
    });

    // Get updated counts
    const updatedFollowing = await this.findById(followingId);

    return {
      success: true,
      message: 'Successfully followed user',
      followersCount: updatedFollowing?.followersCount,
      followingCount: updatedFollowing?.followingCount,
    };
  }

  async unfollowUser(
    followerId: string,
    followingId: string,
  ): Promise<FollowResponseDto> {
    // Prevent self-unfollow
    if (followerId === followingId) {
      throw new BadRequestException('Invalid operation');
    }

    // Check if follow relationship exists
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    if (!follow) {
      throw new BadRequestException('You are not following this user');
    }

    // Remove follow relationship
    await this.dataSource.transaction(async (manager) => {
      // Delete follow record
      await manager.delete(Follow, { id: follow.id });

      // Update counters
      await manager.decrement(User, { id: followerId }, 'followingCount', 1);
      await manager.decrement(User, { id: followingId }, 'followersCount', 1);
    });

    // Get updated counts
    const updatedFollowing = await this.findById(followingId);

    return {
      success: true,
      message: 'Successfully unfollowed user',
      followersCount: updatedFollowing?.followersCount,
      followingCount: updatedFollowing?.followingCount,
    };
  }

  async getFollowers(
    userId: string,
    query: FollowersQueryDto,
    currentUserId?: string,
  ): Promise<FollowersListResponseDto> {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    // Build query
    const queryBuilder = this.followRepository
      .createQueryBuilder('follow')
      .leftJoinAndSelect('follow.follower', 'follower')
      .where('follow.followingId = :userId', { userId })
      .andWhere('follower.isActive = :isActive', { isActive: true });

    // Add search filter
    if (search) {
      queryBuilder.andWhere(
        '(follower.username ILIKE :search OR follower.displayName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Get total count and data
    const [follows, total] = await queryBuilder
      .orderBy('follow.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Transform to response format
    const followers: FollowerUserDto[] = await Promise.all(
      follows.map(async (follow) => {
        const isFollowingBack = currentUserId
          ? await this.isFollowing(currentUserId, follow.follower.id)
          : false;

        return {
          id: follow.follower.id,
          username: follow.follower.username,
          displayName: follow.follower.displayName,
          avatar: follow.follower.avatar,
          isVerified: follow.follower.isVerified,
          followedAt: follow.createdAt,
          isFollowingBack,
        };
      }),
    );

    return {
      followers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getFollowing(
    userId: string,
    query: FollowersQueryDto,
    currentUserId?: string,
  ): Promise<FollowersListResponseDto> {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    // Build query
    const queryBuilder = this.followRepository
      .createQueryBuilder('follow')
      .leftJoinAndSelect('follow.following', 'following')
      .where('follow.followerId = :userId', { userId })
      .andWhere('following.isActive = :isActive', { isActive: true });

    // Add search filter
    if (search) {
      queryBuilder.andWhere(
        '(following.username ILIKE :search OR following.displayName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Get total count and data
    const [follows, total] = await queryBuilder
      .orderBy('follow.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Transform to response format
    const following: FollowerUserDto[] = await Promise.all(
      follows.map(async (follow) => {
        const isFollowingBack = currentUserId
          ? await this.isFollowing(follow.following.id, currentUserId)
          : false;

        return {
          id: follow.following.id,
          username: follow.following.username,
          displayName: follow.following.displayName,
          avatar: follow.following.avatar,
          isVerified: follow.following.isVerified,
          followedAt: follow.createdAt,
          isFollowingBack,
        };
      }),
    );

    return {
      followers: following, // Reusing same structure
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });
    return !!follow;
  }

  async getFollowStats(userId: string): Promise<FollowStatsDto> {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      postsCount: user.postsCount,
      likesCount: user.likesCount,
    };
  }

  // Helper method to get mutual follows
  async getMutualFollows(
    userId1: string,
    userId2: string,
  ): Promise<FollowerUserDto[]> {
    const mutualFollows = await this.followRepository
      .createQueryBuilder('f1')
      .innerJoin(
        'follows',
        'f2',
        'f1.followingId = f2.followingId AND f1.followerId != f2.followerId',
      )
      .leftJoinAndSelect('f1.following', 'user')
      .where('f1.followerId = :userId1 AND f2.followerId = :userId2', {
        userId1,
        userId2,
      })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .limit(10) // Limit mutual follows
      .getMany();

    return mutualFollows.map((follow) => ({
      id: follow.following.id,
      username: follow.following.username,
      displayName: follow.following.displayName,
      avatar: follow.following.avatar,
      isVerified: follow.following.isVerified,
      followedAt: follow.createdAt,
    }));
  }
}
