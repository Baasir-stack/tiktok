export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface OTPEmailData {
  name: string;
  code: string;
  expiryMinutes: number;
}

export interface WelcomeEmailData {
  name: string;
  username: string;
}

export interface PasswordResetEmailData {
  name: string;
  code: string;
  expiryMinutes: number;
}
