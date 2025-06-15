/* eslint-disable @typescript-eslint/no-unused-vars */

// src/auth/auth.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { generateTokens } from 'src/common/utils/jwt-utils';
import { Otp } from './entities/otp.entity';
import { EmailService } from 'src/common/services/email.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { LoginUserDto } from './dto/login-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { DataSource } from 'typeorm';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Otp)
    private readonly otpRepo: Repository<Otp>,
    private readonly dataSource: DataSource,

    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private emailService: EmailService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get('GOOGLE_CLIENT_ID'),
    );
  }

  async register(dto: CreateUserDto) {
    const existingUser = await this.findUserByEmail(dto.email);

    if (existingUser) {
      if (!existingUser.password && existingUser.provider === 'google') {
        await this.handleGoogleUserOtpFlow(dto.email);
        return {
          message: 'Email registered with Google. OTP sent for verification.',
          data: {
            status: 'OTP_SENT',
            email: dto.email,
          },
        };
      } else {
        throw new ConflictException('Email already exists');
      }
    }

    // Create user without transaction first
    const user = this.userRepo.create({
      ...dto,
      username: User.generateUsernameFromName(dto.displayName),
      provider: 'local',
      isEmailVerified: false,
      isVerified: false,
      isActive: true,
    });

    console.log('=== Registration Debug ===');
    console.log('User before save:', {
      email: user.email,
      hasPassword: !!user.password,
      provider: user.provider,
    });

    // Save user first (this will hash the password)
    const savedUser = await this.userRepo.save(user);

    console.log('User after save:', {
      id: savedUser.id,
      email: savedUser.email,
      hasPassword: !!savedUser.password,
      passwordLength: savedUser.password?.length,
    });

    // Generate tokens
    const tokens = await generateTokens(
      savedUser.id,
      savedUser.email,
      savedUser.role,
      this.jwtService,
    );

    // Update refresh token separately
    savedUser.hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepo.save(savedUser);

    return {
      message: 'Registration successful',
      data: {
        ...savedUser.toSafeResponse(),
      },
      tokens,
    };
  }

  async loginWithGoogle(idToken: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: this.configService.get('GOOGLE_CLIENT_ID'),
    });

    const payload = ticket.getPayload();
    if (!payload) throw new UnauthorizedException('Invalid Google token');

    const { email, name, picture } = payload;

    let user = await this.userRepo.findOne({ where: { email } });

    let isNewUser = false;

    if (!user) {
      // New Google user - register them
      user = this.userRepo.create({
        email,
        username: User.generateUsernameFromName(name),
        displayName: name,
        avatar: picture,
        password: '', // Set blank, since Google user
        isEmailVerified: true,
        provider: 'google',
      });
      await this.userRepo.save(user);
      isNewUser = true;
    }

    const tokens = await generateTokens(
      user.id,
      user.email,
      user.role,
      this.jwtService,
    );

    user.hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepo.save(user);

    return {
      message: isNewUser
        ? 'Registration successful (Google)'
        : 'Login successful (Google)',
      data: {
        ...user.toSafeResponse(),
      },
      tokens,
    };
  }

  async login(dto: LoginUserDto) {
    const user = await this.findUserByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid email or password');

    if (user.provider !== 'local') {
      throw new BadRequestException(
        `This email is registered via ${user.provider}. Please use ${user.provider} login.`,
      );
    }

    console.log('=== Login Debug ===');
    console.log('User found:', {
      id: user.id,
      email: user.email,
      hasPassword: !!user.password,
      passwordLength: user.password?.length,
      provider: user.provider,
    });
    console.log('Input password length:', dto.password?.length);

    const isPasswordValid = await user.comparePassword(dto.password);
    console.log('Password validation result:', isPasswordValid);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await generateTokens(
      user.id,
      user.email,
      user.role,
      this.jwtService,
    );

    // Update user fields without triggering password hash
    await this.userRepo.update(user.id, {
      hashedRefreshToken: await bcrypt.hash(tokens.refreshToken, 10),
      lastLoginAt: new Date(),
    });

    // Get fresh user data for response
    await this.userRepo.findOne({ where: { id: user.id } });

    return {
      message: 'Login successful',
      data: {
        ...user.toSafeResponse(),
      },
      tokens,
    };
  }

  async sendPasswordResetOtp(dto: ForgotPasswordDto) {
    const { email } = dto;

    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException('No account found with this email.');
    }

    const code = Otp.generateCode();
    const expiresAt = Otp.createExpiryTime();

    const otp = this.otpRepo.create({
      email,
      code,
      type: 'password_reset',
      expiresAt,
    });
    await this.otpRepo.save(otp);

    await this.emailService.sendPasswordResetEmail(user.email, {
      name: user.displayName, // fallback to username if name doesn't exist
      code,
      expiryMinutes: 15,
    });

    return {
      message: 'OTP sent to your email for password reset.',
      data: {
        email,
        status: 'OTP_SENT',
      },
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { email, otp, newPassword } = dto;

    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException('No account found with this email.');
    }

    const otpEntry = await this.otpRepo.findOne({
      where: { email, code: otp, type: 'password_reset' },
    });

    if (!otpEntry) {
      throw new BadRequestException('Invalid OTP.');
    }

    if (otpEntry.expiresAt < new Date()) {
      throw new BadRequestException('OTP has expired.');
    }

    user.password = newPassword;
    await this.userRepo.save(user); // Will automatically hash password via @BeforeUpdate()

    // Delete used OTP
    await this.otpRepo.delete({ id: otpEntry.id });

    return {
      message:
        'Password reset successful. You can now log in with your new password.',
    };
  }

  // Helper: Find user by email
  private async findUserByEmail(email: string) {
    return this.userRepo.findOne({ where: { email } });
  }

  // Helper: Handle OTP generation and sending for Google registered users
  private async handleGoogleUserOtpFlow(email: string) {
    const code = Otp.generateCode();

    const otp = this.otpRepo.create({
      email,
      code,
      type: 'email_verification',
      expiresAt: Otp.createExpiryTime(),
    });

    await this.otpRepo.save(otp);

    // Find the user (Google-registered one)
    const user = await this.userRepo.findOne({ where: { email } });

    const name = user?.displayName || 'there';

    // Send OTP email
    await this.emailService.sendOTPVerificationEmail(email, {
      name,
      code,
      expiryMinutes: 10,
    });
  }

  // Helper: Create a new local user with hashed password
  private createLocalUser(dto: CreateUserDto): User {
    const user = this.userRepo.create({
      email: dto.email,
      password: dto.password, // raw password — will be hashed by entity
      displayName: dto.displayName,
      dateOfBirth: new Date(dto.dateOfBirth),
      provider: 'local',
      isEmailVerified: false,
      isVerified: false,
      isActive: true,
    });

    return user;
  }

  async validateUser(email: string, password: string) {
    return this.userRepo.findOne({ where: { email } });
  }
  //   async validateOAuthLogin(...any:any){
  //     return "hellow"
  //   }

  async verifyOtp(dto: VerifyOtpDto) {
    const { email, code } = dto;

    const otpRecord = await this.otpRepo.findOne({
      where: {
        email,
        code,
        type: 'email_verification',
      },
      order: { createdAt: 'DESC' },
    });

    if (!otpRecord) {
      throw new NotFoundException('Invalid or expired OTP');
    }

    if (new Date() > otpRecord.expiresAt) {
      throw new BadRequestException('OTP has expired');
    }

    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isEmailVerified = true;

    const tokens = await generateTokens(
      user.id,
      user.email,
      user.role,
      this.jwtService,
    );
    user.hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);

    await this.userRepo.save(user);

    await this.otpRepo.delete({ email, type: 'email_verification' });

    return {
      message: 'OTP verified successfully. Tokens issued.',
      tokens,
      data: user.toSafeResponse(),
    };
  }
}
