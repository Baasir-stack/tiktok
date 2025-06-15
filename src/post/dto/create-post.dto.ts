/* eslint-disable @typescript-eslint/no-unused-vars */
// src/post/dto/create-post.dto.ts
import { IsOptional, IsString, IsBoolean, IsNotEmpty } from 'class-validator';

export class CreatePostDto {
  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  hashtags?: string;

  @IsBoolean()
  isPublic: boolean;
}
