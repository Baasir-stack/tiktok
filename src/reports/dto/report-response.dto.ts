import {
  ReportReason,
  ReportStatus,
  ReportSeverity,
} from '../entities/report.entity';

export class ReportResponseDto {
  id: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  severity: ReportSeverity;
  createdAt: Date;
  updatedAt: Date;
  adminNotes?: string;
  reviewedAt?: Date;

  // Minimal user info
  reportedBy: {
    id: string;
    username: string;
  };

  // Minimal post info
  post: {
    id: string;
    content: string;
    createdAt: Date;
    user: {
      id: string;
      username: string;
    };
  };
}
