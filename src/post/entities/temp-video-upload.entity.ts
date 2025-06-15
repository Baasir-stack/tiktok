import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

export enum TempVideoStatus {
  UPLOADED = 'uploaded',
  USED = 'used',
  DISCARDED = 'discarded',
  EXPIRED = 'expired',
}

@Entity('temp_video_uploads')
@Index(['userId', 'status'])
@Index(['createdAt']) // For cleanup job
export class TempVideoUpload {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 500 })
  videoUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'varchar', length: 255 })
  publicId: string; // Cloudinary public_id for deletion

  // Video metadata
  @Column({ type: 'int', nullable: true })
  videoDuration: number;

  @Column({ type: 'int', nullable: true })
  videoWidth: number;

  @Column({ type: 'int', nullable: true })
  videoHeight: number;

  @Column({ type: 'bigint', nullable: true })
  videoFileSize: number;

  @Column({ nullable: true })
  localFilePath?: string; // Store the local file path for cleanup

  @Column({
    type: 'enum',
    enum: TempVideoStatus,
    default: TempVideoStatus.UPLOADED,
  })
  @Index()
  status: TempVideoStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceType: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  appVersion: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @BeforeInsert()
  setExpiresAt() {
    const now = new Date();
    now.setHours(now.getHours() + 24); // Adds 24 hours
    this.expiresAt = now;
  }
}
