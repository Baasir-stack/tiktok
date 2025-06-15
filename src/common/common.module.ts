import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './services/email.service';
import { UploadService } from './services/upload.service';

@Module({
  imports: [ConfigModule],
  providers: [EmailService, UploadService],
  exports: [EmailService, UploadService],
})
export class CommonModule {}
