import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Post } from '../../post/entities/post.entity';

export enum ReportReason {
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  HATE_SPEECH = 'hate_speech',
  VIOLENCE = 'violence',
  NUDITY = 'nudity',
  FALSE_INFORMATION = 'false_information',
  COPYRIGHT = 'copyright',
  SUICIDE_SELF_HARM = 'suicide_self_harm',
  DANGEROUS_ACTS = 'dangerous_acts',
  MINOR_SAFETY = 'minor_safety',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum ReportSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('reports')
@Index(['reportedBy', 'post'], { unique: true }) // Prevent duplicate reports
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ReportReason,
  })
  reason: ReportReason;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Column({
    type: 'enum',
    enum: ReportSeverity,
    default: ReportSeverity.LOW,
  })
  severity: ReportSeverity;

  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string; // Admin user ID

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reported_by' })
  reportedBy: User;

  @Column('uuid')
  reported_by: string;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @Column('uuid')
  post_id: string;

  // Helper method to determine severity based on reason
  static getSeverityByReason(reason: ReportReason): ReportSeverity {
    const severityMap = {
      [ReportReason.MINOR_SAFETY]: ReportSeverity.CRITICAL,
      [ReportReason.SUICIDE_SELF_HARM]: ReportSeverity.CRITICAL,
      [ReportReason.VIOLENCE]: ReportSeverity.HIGH,
      [ReportReason.HATE_SPEECH]: ReportSeverity.HIGH,
      [ReportReason.HARASSMENT]: ReportSeverity.MEDIUM,
      [ReportReason.NUDITY]: ReportSeverity.MEDIUM,
      [ReportReason.DANGEROUS_ACTS]: ReportSeverity.MEDIUM,
      [ReportReason.SPAM]: ReportSeverity.LOW,
      [ReportReason.FALSE_INFORMATION]: ReportSeverity.LOW,
      [ReportReason.COPYRIGHT]: ReportSeverity.LOW,
      [ReportReason.OTHER]: ReportSeverity.LOW,
    };
    return severityMap[reason] || ReportSeverity.LOW;
  }
}
