/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from 'src/common/services/upload.service';
import { videoMulterConfig } from 'src/config/multer-video.config';
import { localMulterConfig } from 'src/config/multer.config';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', localMulterConfig))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const uploaded = await this.uploadService.uploadImageToCloudinary(file);
    return {
      message: 'Image uploaded successfully',
      data: uploaded,
    };
  }

  @Post('video')
  @UseInterceptors(FileInterceptor('file', videoMulterConfig))
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    const uploaded = await this.uploadService.uploadVideoToCloudinary(file);
    return {
      message: 'Video uploaded successfully',
      data: uploaded,
    };
  }
}
