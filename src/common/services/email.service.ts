import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import {
  EmailTemplate,
  OTPEmailData,
  WelcomeEmailData,
  PasswordResetEmailData,
} from '../interfaces/email-template.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private fromEmail: string;
  private fromName: string;
  private appName: string;
  private appUrl: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY is required');
    }

    sgMail.setApiKey(apiKey);
    this.fromEmail = this.configService.get<string>('FROM_EMAIL')!;
    this.fromName = this.configService.get<string>('FROM_NAME')!;
    this.appName = this.configService.get<string>('APP_NAME')!;
    this.appUrl = this.configService.get<string>('APP_URL')!;
  }

  async sendEmail({
    to,
    subject,
    html,
    text,
  }: EmailTemplate): Promise<boolean> {
    try {
      const msg = {
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject,
        text,
        html,
      };

      const response = await sgMail.send(msg);

      this.logger.log(
        `Email sent successfully to ${to}. Status: ${response[0].statusCode}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Error sending email to ${to}:`, error);
      return false;
    }
  }

  async sendOTPVerificationEmail(
    to: string,
    data: OTPEmailData,
  ): Promise<boolean> {
    const template = this.generateOTPVerificationTemplate(data);

    return this.sendEmail({
      to,
      subject: `Verify your ${this.appName} account`,
      html: template.html,
      text: template.text,
    });
  }

  async sendPasswordResetEmail(
    to: string,
    data: PasswordResetEmailData,
  ): Promise<boolean> {
    const template = this.generatePasswordResetTemplate(data);

    return this.sendEmail({
      to,
      subject: `Reset your ${this.appName} password`,
      html: template.html,
      text: template.text,
    });
  }

  async sendWelcomeEmail(to: string, data: WelcomeEmailData): Promise<boolean> {
    const template = this.generateWelcomeTemplate(data);

    return this.sendEmail({
      to,
      subject: `Welcome to ${this.appName}!`,
      html: template.html,
      text: template.text,
    });
  }

  private generateOTPVerificationTemplate(data: OTPEmailData): {
    html: string;
    text: string;
  } {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Account</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .otp-code { background: #f8f9fa; border: 2px dashed #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 30px 0; }
            .code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; font-family: 'Courier New', monospace; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎵 ${this.appName}</h1>
              <p>Verify your account to get started!</p>
            </div>
            <div class="content">
              <h2>Hi ${data.name}! 👋</h2>
              <p>Welcome to ${this.appName}! To complete your account setup, please verify your email address using the code below:</p>
              
              <div class="otp-code">
                <div class="code">${data.code}</div>
                <p style="margin: 10px 0 0 0; color: #666;">Enter this code to verify your account</p>
              </div>
              
              <p><strong>⏰ This code will expire in ${data.expiryMinutes} minutes.</strong></p>
              
              <p>If you didn't create an account with ${this.appName}, you can safely ignore this email.</p>
              
              <p>Need help? Reply to this email and we'll get back to you!</p>
            </div>
            <div class="footer">
              <p>© 2024 ${this.appName}. All rights reserved.</p>
              <p>This is an automated message, please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Welcome to ${this.appName}!
      
      Hi ${data.name},
      
      Please verify your email address using this code: ${data.code}
      
      This code will expire in ${data.expiryMinutes} minutes.
      
      If you didn't create an account, please ignore this email.
      
      Best regards,
      The ${this.appName} Team
    `;

    return { html, text };
  }

  private generatePasswordResetTemplate(data: PasswordResetEmailData): {
    html: string;
    text: string;
  } {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .otp-code { background: #fff5f5; border: 2px dashed #ff6b6b; border-radius: 10px; padding: 20px; text-align: center; margin: 30px 0; }
            .code { font-size: 32px; font-weight: bold; color: #ff6b6b; letter-spacing: 5px; font-family: 'Courier New', monospace; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset</h1>
              <p>Reset your ${this.appName} password</p>
            </div>
            <div class="content">
              <h2>Hi ${data.name}! 👋</h2>
              <p>We received a request to reset your password for your ${this.appName} account. Use the code below to reset your password:</p>
              
              <div class="otp-code">
                <div class="code">${data.code}</div>
                <p style="margin: 10px 0 0 0; color: #666;">Enter this code to reset your password</p>
              </div>
              
              <p><strong>⏰ This code will expire in ${data.expiryMinutes} minutes.</strong></p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email and consider changing your password for security.
              </div>
              
              <p>Need help? Reply to this email and we'll get back to you!</p>
            </div>
            <div class="footer">
              <p>© 2024 ${this.appName}. All rights reserved.</p>
              <p>This is an automated message, please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Password Reset - ${this.appName}
      
      Hi ${data.name},
      
      We received a request to reset your password. Use this code: ${data.code}
      
      This code will expire in ${data.expiryMinutes} minutes.
      
      If you didn't request this, please ignore this email.
      
      Best regards,
      The ${this.appName} Team
    `;

    return { html, text };
  }

  private generateWelcomeTemplate(data: WelcomeEmailData): {
    html: string;
    text: string;
  } {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ${this.appName}!</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
            .feature { background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to ${this.appName}!</h1>
              <p>Your creative journey starts here</p>
            </div>
            <div class="content">
              <h2>Hi ${data.name}! 👋</h2>
              <p>Welcome to ${this.appName}! We're excited to have you join our community of creators and viewers.</p>
              
              <p><strong>Your username:</strong> @${data.username}</p>
              
              <div class="feature">
                <h3>🎬 What's Next?</h3>
                <ul>
                  <li>Complete your profile setup</li>
                  <li>Upload your first video</li>
                  <li>Follow creators you love</li>
                  <li>Start engaging with the community</li>
                </ul>
              </div>
              
              <p>Thanks for joining our creative community!</p>
              
              <p>If you have any questions, don't hesitate to reach out to our support team!</p>
            </div>
            <div class="footer">
              <p>© 2024 ${this.appName}. All rights reserved.</p>
              <p>Follow us for updates and tips!</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Welcome to ${this.appName}!
      
      Hi ${data.name},
      
      Welcome to our community! Your username is: @${data.username}
      
      Get started by:
      - Completing your profile
      - Uploading your first video  
      - Following creators you love
      - Engaging with the community
      
      Thanks for joining our creative community!
      
      Best regards,
      The ${this.appName} Team
    `;

    return { html, text };
  }
}
