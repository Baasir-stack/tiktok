/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/reports/reports.controller.ts
import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { GetReportsQueryDto } from './dto/get-reports-query.dto';
import { ResponseFormat } from '../common/interfaces/response-format.interface';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { Request } from 'express';
import { AdminGuard } from 'src/common/guards/admin.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // User endpoints
  @Post('post/:postId')
  async reportPost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() createReportDto: CreateReportDto,
    @Req() req: Request,
  ): Promise<ResponseFormat<any>> {
    const report = await this.reportsService.createReport(
      postId,
      req.user.id,
      createReportDto,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Post reported successfully',
      data: {
        reportId: report.id,
        status: report.status,
      },
    };
  }

  @Get('post/:postId/status')
  async getReportStatus(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Req() req: Request,
  ): Promise<ResponseFormat<{ hasReported: boolean }>> {
    const hasReported = await this.reportsService.getReportStatus(
      postId,
      req.user.sub,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Report status retrieved successfully',
      data: { hasReported },
    };
  }

  @Get('reasons')
  getReportReasons(): ResponseFormat<any[]> {
    const reasons = this.reportsService.getReportReasons();

    return {
      statusCode: HttpStatus.OK,
      message: 'Report reasons retrieved successfully',
      data: reasons,
    };
  }

  // Admin endpoints
  @Get('admin/all')
  @UseGuards(AdminGuard)
  async getAllReports(
    @Query() query: GetReportsQueryDto,
  ): Promise<ResponseFormat<any>> {
    const result = await this.reportsService.getAllReports(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Reports retrieved successfully',
      data: result,
    };
  }

  @Put('admin/:reportId/status')
  @UseGuards(AdminGuard)
  async updateReportStatus(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() updateReportStatusDto: UpdateReportStatusDto,
    @Req() req: Request,
  ): Promise<ResponseFormat<any>> {
    const report = await this.reportsService.updateReportStatus(
      reportId,
      req.user.sub,
      updateReportStatusDto,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Report status updated successfully',
      data: {
        reportId: report.id,
        status: report.status,
        reviewedAt: report.reviewedAt,
      },
    };
  }

  @Get('admin/post/:postId')
  @UseGuards(AdminGuard)
  async getReportsForPost(
    @Param('postId', ParseUUIDPipe) postId: string,
  ): Promise<ResponseFormat<any[]>> {
    const reports = await this.reportsService.getReportsForPost(postId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Post reports retrieved successfully',
      data: reports,
    };
  }
}
