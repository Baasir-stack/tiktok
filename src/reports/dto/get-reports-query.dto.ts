/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { IsOptional, IsEnum, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  ReportStatus,
  ReportReason,
  ReportSeverity,
} from '../entities/report.entity';

export class GetReportsQueryDto {
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @IsOptional()
  @IsEnum(ReportReason)
  reason?: ReportReason;

  @IsOptional()
  @IsEnum(ReportSeverity)
  severity?: ReportSeverity;

  @IsOptional()
  @IsUUID()
  postId?: string;

  @IsOptional()
  @IsUUID()
  reportedBy?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
