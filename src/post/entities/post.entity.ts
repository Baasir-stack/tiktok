// src/post/entities/post.entity.ts

// src/post/entities/post.entity.ts
import { Report } from 'src/reports/entities/report.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
  OneToMany,
} from 'typeorm';

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  UNDER_REVIEW = 'under_review',
  REJECTED = 'rejected',
  REMOVED = 'removed',
}

export enum VideoQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  HD = 'hd',
}

@Entity('posts')
@Index(['userId', 'createdAt'])
@Index(['isPublic', 'status', 'createdAt'])
@Index(['hashtags'])
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.posts, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  @Index()
  userId: string; // Changed to string to match UUID

  @Column({ type: 'text', nullable: true })
  caption: string;

  @Column({ type: 'simple-array', nullable: true })
  hashtags: string[]; // Better to store as array instead of comma-separated

  @Column({ type: 'varchar', length: 500 })
  videoUrlHigh: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  videoUrlMedium: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  videoUrlLow: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl: string;

  // Video metadata
  @Column({ type: 'int', nullable: true })
  videoDuration: number; // in seconds

  @Column({ type: 'int', nullable: true })
  videoWidth: number;

  @Column({ type: 'int', nullable: true })
  videoHeight: number;

  @Column({ type: 'bigint', nullable: true })
  videoFileSize: number; // in bytes

  @Column({ type: 'enum', enum: VideoQuality, default: VideoQuality.HIGH })
  primaryVideoQuality: VideoQuality;

  // Engagement metrics
  @Column({ default: 0 })
  @Index()
  likesCount: number;

  @Column({ default: 0 })
  commentsCount: number;

  @Column({ default: 0 })
  sharesCount: number;

  @Column({ default: 0 })
  @Index()
  viewsCount: number;

  @Column({ default: 0 })
  saveCount: number; // bookmarks/favorites

  @Column({ default: 0 })
  downloadCount: number;

  // Privacy and moderation
  @Column({ default: true })
  @Index()
  isPublic: boolean;

  @Column({ default: true })
  allowComments: boolean; // This handles comment section on/off feature

  @Column({ default: true })
  allowDuet: boolean;

  @Column({ default: true })
  allowStitch: boolean;

  @Column({ default: true })
  allowDownload: boolean;

  @Column({ type: 'enum', enum: PostStatus, default: PostStatus.PUBLISHED })
  @Index()
  status: PostStatus;

  // Geographic data
  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  // Moderation and reporting
  @Column({ default: false })
  isReported: boolean;

  @Column({ default: 0 })
  reportCount: number;

  @Column({ type: 'timestamp', nullable: true })
  reportedAt: Date;

  @Column({ type: 'text', nullable: true })
  moderationNotes: string;

  @Column({ default: false })
  isAgeRestricted: boolean;

  // Algorithm and discovery
  @Column({ type: 'simple-array', nullable: true })
  detectedObjects: string[]; // AI-detected objects in video

  @Column({ type: 'simple-array', nullable: true })
  detectedAudio: string[]; // AI-detected audio/music

  @Column({ type: 'float', default: 0 })
  engagementScore: number; // calculated engagement rate

  @Column({ type: 'timestamp', nullable: true })
  lastInteractionAt: Date;

  // Content creation details
  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceType: string; // iOS, Android, Web

  @Column({ type: 'varchar', length: 50, nullable: true })
  appVersion: string;

  @Column({ type: 'simple-json', nullable: true })
  filters: object; // applied filters/effects

  @Column({ type: 'simple-json', nullable: true })
  effects: object; // applied effects

  // Music/Audio
  @Column({ type: 'varchar', length: 255, nullable: true })
  audioUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  musicId: string; // reference to music library

  @Column({ type: 'varchar', length: 255, nullable: true })
  musicTitle: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  musicArtist: string;

  // Scheduling
  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Soft delete
  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;
  isDeleted: boolean;

  @OneToMany(() => Report, (report) => report.post, {
    cascade: true,
    lazy: true,
  })
  reports: Report[];
}
