/* eslint-disable @typescript-eslint/no-unsafe-call */
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreatePostMetadataDto } from './create-post-metadata.dto';

export class UpdatePostDto extends PartialType(
  OmitType(CreatePostMetadataDto, ['tempVideoId'] as const),
) {}
