import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsUUID,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';

export class CreatePostMetadataDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  caption?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  hashtags?: string[];

  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @IsOptional()
  @IsBoolean()
  allowDuet?: boolean;

  @IsOptional()
  @IsBoolean()
  allowStitch?: boolean;

  @IsOptional()
  @IsBoolean()
  allowDownload?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  // For the two-step upload process
  @IsOptional()
  @IsUUID()
  tempVideoId?: string;
}
