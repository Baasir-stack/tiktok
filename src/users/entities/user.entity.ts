/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BeforeInsert,
  BeforeUpdate,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude, Transform } from 'class-transformer';
import { IsEmail, IsOptional, Length, Matches } from 'class-validator';
import * as bcrypt from 'bcrypt';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ nullable: true, unique: true, length: 30 })
  @IsOptional()
  @Length(3, 30, { message: 'Username must be between 3 and 30 characters' })
  @Matches(/^[a-zA-Z0-9._]+$/, {
    message: 'Username can only contain letters, numbers, dots and underscores',
  })
  username: string;

  @Column({ nullable: true, length: 50 })
  @Length(1, 50, {
    message: 'Display name must be between 1 and 50 characters',
  })
  displayName: string;

  @Index()
  @Column({ unique: true, length: 255 })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @Column({ nullable: true, type: 'date' })
  dateOfBirth: Date;

  @Column({ nullable: true, length: 500 })
  avatar: string;

  @Column({ nullable: true, length: 300 })
  @Length(0, 300, { message: 'Bio cannot exceed 300 characters' })
  bio: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Exclude()
  @Column({ nullable: true })
  password: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @Column({ type: 'text', nullable: true })
  hashedRefreshToken: string | null;

  @Column({
    type: 'enum',
    enum: ['local', 'google'],
    default: 'local',
  })
  provider: 'local' | 'google';

  @Index()
  @Column({ nullable: true, unique: true })
  googleId: string;

  // Phone number for SMS verification (TikTok's primary method)
  @Index()
  @Column({ nullable: true, unique: true, length: 20 })
  phoneNumber: string;

  @Column({ default: false })
  isPhoneVerified: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  // User engagement metrics (useful for TikTok clone)
  @Column({ default: 0 })
  @Transform(({ value }) => parseInt(value, 10))
  followingCount: number;

  @Column({ default: 0 })
  @Transform(({ value }) => parseInt(value, 10))
  followersCount: number;

  @Column({ default: 0 })
  @Transform(({ value }) => parseInt(value, 10))
  likesCount: number;

  // Privacy settings
  @Column({ default: false })
  isPrivate: boolean;

  // Account status tracking
  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  suspendedAt: Date;

  @Column({ nullable: true, length: 500 })
  suspensionReason: string;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && this.provider === 'local') {
      this.password = await bcrypt.hash(this.password, 12); // Increased from 10 to 12 for better security
    }
  }

  async comparePassword(plain: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(plain, this.password);
  }

  // Enhanced safe response method
  toSafeResponse() {
    const {
      password,
      hashedRefreshToken,
      googleId,
      suspensionReason,
      ...safeUser
    } = this;
    return safeUser;
  }

  // Public profile response (what other users see)
  toPublicProfile() {
    return {
      id: this.id,
      username: this.username,
      displayName: this.displayName,
      avatar: this.avatar,
      bio: this.bio,
      isVerified: this.isVerified,
      followersCount: this.followersCount,
      followingCount: this.followingCount,
      likesCount: this.likesCount,
      isPrivate: this.isPrivate,
      createdAt: this.createdAt,
    };
  }

  // Check if user can be followed/interacted with
  canInteract(): boolean {
    return this.isActive && !this.suspendedAt;
  }

  // Generate a unique username suggestion
  static generateUsernameFromName(name?: string): string {
    const baseName = (name || 'goodboy').split(' ')[0]; // Take first word
    const base = baseName.replace(/[^a-zA-Z0-9]/g, '');
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${base}${suffix}`.substring(0, 30);
  }
}
