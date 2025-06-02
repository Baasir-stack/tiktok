/* eslint-disable prettier/prettier */
// src/auth/entities/otp.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ length: 255 })
  email: string;

  @Column({ length: 6 })
  code: string;

  @Column({
    type: 'enum',
    enum: ['email_verification', 'password_reset'],
  })
  type: 'email_verification' | 'password_reset';

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ default: 0 })
  attempts: number; // Track verification attempts

  @CreateDateColumn()
  createdAt: Date;

  // Helper method to check if OTP is expired
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  // Helper method to check if OTP is valid
  isValid(): boolean {
    return !this.isUsed && !this.isExpired() && this.attempts < 3;
  }

  // Generate a 6-digit OTP code
  static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Create expiry time (15 minutes from now)
  static createExpiryTime(): Date {
    return new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  }
}