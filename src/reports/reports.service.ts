/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
// src/reports/reports.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Report,
  ReportReason,
  ReportStatus,
  ReportSeverity,
} from './entities/report.entity';
import { Post } from '../post/entities/post.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { GetReportsQueryDto } from './dto/get-reports-query.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async createReport(
    postId: string,
    userId: string,
    createReportDto: CreateReportDto,
  ): Promise<Report> {
    // Check if post exists
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['user'],
    });

    console.log('userId', userId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Prevent self-reporting
    if (post.user.id === userId) {
      throw new BadRequestException('You cannot report your own post');
    }

    // Check for duplicate report
    const existingReport = await this.reportRepository.findOne({
      where: {
        post_id: postId,
        reported_by: userId,
      },
    });

    if (existingReport) {
      throw new ConflictException('You have already reported this post');
    }

    // Determine severity based on reason
    const severity = Report.getSeverityByReason(createReportDto.reason);

    // Create report
    const report = this.reportRepository.create({
      post_id: postId,
      reported_by: userId,
      reason: createReportDto.reason,
      description: createReportDto.description,
      severity,
    });

    const savedReport = await this.reportRepository.save(report);

    // Check if post should be auto-moderated
    await this.checkAutoModeration(postId);

    return savedReport;
  }

  async getReportStatus(postId: string, userId: string): Promise<boolean> {
    const report = await this.reportRepository.findOne({
      where: {
        post_id: postId,
        reported_by: userId,
      },
    });

    return !!report;
  }

  getReportReasons(): { reason: string; label: string }[] {
    return [
      { reason: ReportReason.SPAM, label: 'Spam' },
      { reason: ReportReason.HARASSMENT, label: 'Harassment or bullying' },
      { reason: ReportReason.HATE_SPEECH, label: 'Hate speech' },
      {
        reason: ReportReason.VIOLENCE,
        label: 'Violence or dangerous behavior',
      },
      { reason: ReportReason.NUDITY, label: 'Nudity or sexual content' },
      { reason: ReportReason.FALSE_INFORMATION, label: 'False information' },
      { reason: ReportReason.COPYRIGHT, label: 'Copyright violation' },
      { reason: ReportReason.SUICIDE_SELF_HARM, label: 'Suicide or self-harm' },
      { reason: ReportReason.DANGEROUS_ACTS, label: 'Dangerous acts' },
      { reason: ReportReason.MINOR_SAFETY, label: 'Minor safety' },
      { reason: ReportReason.OTHER, label: 'Other' },
    ];
  }

  // Admin Methods
  async getAllReports(query: GetReportsQueryDto): Promise<{
    reports: Report[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      status,
      reason,
      severity,
      postId,
      reportedBy,
    } = query;

    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reportedBy', 'reporter')
      .leftJoinAndSelect('report.post', 'post')
      .leftJoinAndSelect('post.user', 'postUser');

    // Apply filters
    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }
    if (reason) {
      queryBuilder.andWhere('report.reason = :reason', { reason });
    }
    if (severity) {
      queryBuilder.andWhere('report.severity = :severity', { severity });
    }
    if (postId) {
      queryBuilder.andWhere('report.post_id = :postId', { postId });
    }
    if (reportedBy) {
      queryBuilder.andWhere('report.reported_by = :reportedBy', { reportedBy });
    }

    // Order by creation date (newest first)
    queryBuilder.orderBy('report.createdAt', 'DESC');

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [reports, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      reports,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async updateReportStatus(
    reportId: string,
    adminId: string,
    updateReportStatusDto: UpdateReportStatusDto,
  ): Promise<Report> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['post', 'reportedBy'],
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Update report
    report.status = updateReportStatusDto.status;
    if (updateReportStatusDto.adminNotes) {
      report.adminNotes = updateReportStatusDto.adminNotes;
    }
    report.reviewedBy = adminId;
    report.reviewedAt = new Date();

    // If resolving a high-severity report, take action on the post
    if (
      updateReportStatusDto.status === ReportStatus.RESOLVED &&
      (report.severity === ReportSeverity.HIGH ||
        report.severity === ReportSeverity.CRITICAL)
    ) {
      await this.takePostAction(report.post.id, report.severity);
    }

    return await this.reportRepository.save(report);
  }

  async getReportsForPost(postId: string): Promise<Report[]> {
    return await this.reportRepository.find({
      where: { post_id: postId },
      relations: ['reportedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  // Private helper methods
  private async checkAutoModeration(postId: string): Promise<void> {
    const reportCounts = await this.reportRepository
      .createQueryBuilder('report')
      .select('report.severity, COUNT(*) as count')
      .where('report.post_id = :postId', { postId })
      .andWhere('report.status IN (:...statuses)', {
        statuses: [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW],
      })
      .groupBy('report.severity')
      .getRawMany();

    let shouldFlag = false;
    let shouldRemove = false;

    for (const count of reportCounts) {
      const severity = count.report_severity;
      const reportCount = parseInt(count.count);

      // Auto-moderation thresholds
      if (severity === ReportSeverity.CRITICAL && reportCount >= 1) {
        shouldRemove = true;
        break;
      } else if (severity === ReportSeverity.HIGH && reportCount >= 3) {
        shouldRemove = true;
        break;
      } else if (severity === ReportSeverity.MEDIUM && reportCount >= 5) {
        shouldFlag = true;
      } else if (severity === ReportSeverity.LOW && reportCount >= 10) {
        shouldFlag = true;
      }
    }

    if (shouldRemove) {
      await this.takePostAction(postId, ReportSeverity.CRITICAL);
    } else if (shouldFlag) {
      await this.takePostAction(postId, ReportSeverity.MEDIUM);
    }
  }

  private async takePostAction(
    postId: string,
    severity: ReportSeverity,
  ): Promise<void> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
    });

    if (!post) return;

    switch (severity) {
      case ReportSeverity.CRITICAL:
        // Remove post completely
        post.isDeleted = true;
        break;
      case ReportSeverity.HIGH:
        // Hide post from feed
        post.isDeleted = true;
        break;
      case ReportSeverity.MEDIUM:
        // Flag for review (you might want to add a flag field to Post entity)
        // For now, we'll just log it
        console.log(`Post ${postId} flagged for review`);
        break;
    }

    await this.postRepository.save(post);
  }
}
