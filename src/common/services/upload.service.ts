/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// common/services/upload.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadedFileMetadata } from 'src/common/interfaces/uploaded-file.interface';
import { initializeCloudinary } from 'src/config/cloudinary.config';
import * as path from 'path';

@Injectable()
export class UploadService {
  private cloudinary;

  constructor(private configService: ConfigService) {
    // Initialize Cloudinary with ConfigService
    this.cloudinary = initializeCloudinary(this.configService);

    // Debug logging to verify config is loaded
    // console.log('Cloudinary initialized with:', {
    //   cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
    //   api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
    //   api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET')
    //     ? '***'
    //     : undefined,
    // });
  }

  async uploadImageToCloudinary(
    file: Express.Multer.File,
    folder = 'images',
  ): Promise<UploadedFileMetadata> {
    try {
      const result = await this.cloudinary.uploader.upload(file.path, {
        folder,
        resource_type: 'image',
      });

      return {
        public_id: result.public_id,
        url: result.secure_url,
      };
    } catch (err) {
      console.error('Image upload failed:', err);
      throw new InternalServerErrorException('Image upload failed');
    }
  }

  async uploadVideoToCloudinary(
    file: Express.Multer.File,
    folder = 'videos',
  ): Promise<UploadedFileMetadata> {
    try {
      const normalizedPath = path.resolve(file.path);
      const result = await this.cloudinary.uploader.upload(normalizedPath, {
        folder,
        resource_type: 'video',
        chunk_size: 6000000,
        eager_async: false,
        eager: [
          {
            format: 'jpg',
            transformation: [{ width: 300, height: 300, crop: 'thumb' }],
          },
        ],
      });

      return {
        public_id: result.public_id,
        url: result.secure_url,
        duration: result.duration ?? null,
        thumbnailUrl: result.eager?.[0]?.secure_url ?? null,
      };
    } catch (err) {
      console.error('❌ Cloudinary upload failed:', err);
      throw new InternalServerErrorException('Cloudinary upload failed');
    }
  }

  async deleteAsset(
    publicId: string,
    resourceType: 'image' | 'video' = 'image',
  ): Promise<void> {
    try {
      await this.cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
    } catch (err) {
      console.error('Cloudinary delete failed:', err);
    }
  }
}
