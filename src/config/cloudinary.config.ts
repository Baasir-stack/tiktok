// common/utils/cloudinary.ts
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export const initializeCloudinary = (configService: ConfigService) => {
  cloudinary.config({
    cloud_name: configService.get<string>('CLOUDINARY_CLOUD_NAME'),
    api_key: configService.get<string>('CLOUDINARY_API_KEY'),
    api_secret: configService.get<string>('CLOUDINARY_API_SECRET'),
  });
  return cloudinary;
};
