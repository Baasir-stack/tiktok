/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt.guard'; // Adjust path as needed
import {
  FollowResponseDto,
  FollowersQueryDto,
  FollowersListResponseDto,
  FollowStatsDto,
} from './dto/follow.dto';
import { Request } from 'express';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get current user's follow statistics
   * GET /users/me/stats
   */
  @Get('me/stats')
  async getMyStats(@Req() req: Request): Promise<FollowStatsDto> {
    const currentUserId = req.user.id;
    console.log(currentUserId);
    console.log(req.user);
    return this.usersService.getFollowStats(currentUserId);
  }

  /**
   * Get current user's followers
   * GET /users/me/followers
   */
  @Get('me/followers')
  async getMyFollowers(
    @Query() query: FollowersQueryDto,
    @Req() req: Request,
  ): Promise<FollowersListResponseDto> {
    const currentUserId = req.user.id;
    return this.usersService.getFollowers(currentUserId, query, currentUserId);
  }

  /**
   * Get current user's following list
   * GET /users/me/following
   */
  @Get('me/following')
  async getMyFollowing(
    @Query() query: FollowersQueryDto,
    @Req() req: Request,
  ): Promise<FollowersListResponseDto> {
    const currentUserId = req.user.id;
    return this.usersService.getFollowing(currentUserId, query, currentUserId);
  }

  /**
   * Follow a user
   * POST /users/:userId/follow
   */
  @Post(':userId/follow')
  @HttpCode(HttpStatus.OK)
  async followUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: Request,
  ): Promise<FollowResponseDto> {
    const currentUserId = req.user.id;
    return this.usersService.followUser(currentUserId, userId);
  }

  /**
   * Unfollow a user
   * DELETE /users/:userId/follow
   */
  @Delete(':userId/follow')
  @HttpCode(HttpStatus.OK)
  async unfollowUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: Request,
  ): Promise<FollowResponseDto> {
    const currentUserId = req.user.id;
    return this.usersService.unfollowUser(currentUserId, userId);
  }

  /**
   * Get user's followers
   * GET /users/:userId/followers
   */
  @Get(':userId/followers')
  async getFollowers(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: FollowersQueryDto,
    @Req() req: Request,
  ): Promise<FollowersListResponseDto> {
    const currentUserId = req.user.id;
    return this.usersService.getFollowers(userId, query, currentUserId);
  }

  /**
   * Get user's following list
   * GET /users/:userId/following
   */
  @Get(':userId/following')
  async getFollowing(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: FollowersQueryDto,
    @Req() req: Request,
  ): Promise<FollowersListResponseDto> {
    const currentUserId = req.user.id;
    return this.usersService.getFollowing(userId, query, currentUserId);
  }

  /**
   * Check if current user is following a specific user
   * GET /users/:userId/following/status
   */
  @Get(':userId/following/status')
  async getFollowingStatus(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: Request,
  ): Promise<{ isFollowing: boolean }> {
    const currentUserId = req.user.id;
    const isFollowing = await this.usersService.isFollowing(
      currentUserId,
      userId,
    );
    return { isFollowing };
  }

  /**
   * Get user's follow statistics
   * GET /users/:userId/stats
   */
  @Get(':userId/stats')
  async getFollowStats(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<FollowStatsDto> {
    return this.usersService.getFollowStats(userId);
  }

  /**
   * Get mutual follows between current user and another user
   * GET /users/:userId/mutual
   */
  @Get(':userId/mutual')
  async getMutualFollows(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: Request,
  ) {
    const currentUserId = req.user.id;
    const mutualFollows = await this.usersService.getMutualFollows(
      currentUserId,
      userId,
    );
    return {
      mutualFollows,
      count: mutualFollows.length,
    };
  }
}
