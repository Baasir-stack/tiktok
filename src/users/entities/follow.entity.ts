import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Column,
} from 'typeorm';
import { User } from './user.entity';

@Entity('follows')
@Index(['followerId', 'followingId'], { unique: true }) // Prevent duplicate follows
export class Follow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // The user who is following (follower)
  @Index()
  @ManyToOne(() => User, (user) => user.following, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'follower_id' })
  follower: User;

  @Column({ name: 'follower_id' })
  followerId: string;

  // The user being followed (following)
  @Index()
  @ManyToOne(() => User, (user) => user.followers, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'following_id' })
  following: User;

  @Column({ name: 'following_id' })
  followingId: string;

  @CreateDateColumn()
  createdAt: Date;

  // Helper method to check if this is a valid follow relationship
  isValid(): boolean {
    return this.followerId !== this.followingId;
  }
}
