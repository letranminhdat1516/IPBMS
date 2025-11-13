import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as twilio from 'twilio';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface SMSOptions {
  to: string;
  message: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private emailTransporter: nodemailer.Transporter;
  private twilioClient!: twilio.Twilio;

  constructor(private configService: ConfigService) {
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    // Initialize Twilio client
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    if (accountSid && authToken) {
      this.twilioClient = twilio.default(accountSid, authToken);
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get<string>(
          'SMTP_FROM',
          '"Healthcare VisionAI" <noreply@example.com>',
        ),
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${options.to}: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  /**
   * Send SMS notification via Twilio
   */
  async sendSMS(options: SMSOptions): Promise<boolean> {
    try {
      if (!this.twilioClient) {
        this.logger.warn('Twilio client not configured, skipping SMS send');
        return false;
      }

      const from = this.configService.get<string>('TWILIO_PHONE_NUMBER');
      if (!from) {
        this.logger.warn('Twilio phone number not configured');
        return false;
      }

      const message = await this.twilioClient.messages.create({
        body: options.message,
        from: from,
        to: options.to,
      });

      this.logger.log(`SMS sent successfully to ${options.to}: ${message.sid}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${options.to}:`, error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${this.configService.get<string>(
      'FRONTEND_URL',
      'https://app.healthcarevision.com',
    )}/reset-password?token=${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset for your Healthcare VisionAI account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 1 hour.<br>
          If you didn't request this reset, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          Healthcare VisionAI - AI-powered healthcare monitoring
        </p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Password Reset - Healthcare VisionAI',
      html,
      text: `Reset your password: ${resetUrl}`,
    });
  }

  /**
   * Send 2FA code via SMS
   */
  async send2FACodeSMS(phoneNumber: string, code: string): Promise<boolean> {
    const message = `Your Healthcare VisionAI verification code is: ${code}. This code will expire in 10 minutes.`;

    return this.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send 2FA code via Email
   */
  async send2FACodeEmail(email: string, code: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Your Verification Code</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 4px;">${code}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p style="color: #666; font-size: 14px;">
          If you didn't request this code, please ignore this message.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          Healthcare VisionAI - AI-powered healthcare monitoring
        </p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Your Verification Code - Healthcare VisionAI',
      html,
      text: `Your verification code is: ${code}. This code will expire in 10 minutes.`,
    });
  }

  /**
   * Send subscription expiry reminder
   */
  async sendSubscriptionExpiryReminder(
    email: string,
    planName: string,
    expiryDate: string,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff6b35;">Subscription Expiry Reminder</h2>
        <p>Your <strong>${planName}</strong> subscription will expire on <strong>${expiryDate}</strong>.</p>
        <p>To continue using Healthcare VisionAI services, please renew your subscription.</p>
        <a href="${this.configService.get<string>(
          'FRONTEND_URL',
          'https://app.healthcarevision.com',
        )}/subscription" style="background-color: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">
          Renew Subscription
        </a>
        <p style="color: #666; font-size: 14px;">
          Contact support if you have any questions.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          Healthcare VisionAI - AI-powered healthcare monitoring
        </p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Subscription Expiry Reminder - Healthcare VisionAI',
      html,
      text: `Your ${planName} subscription will expire on ${expiryDate}. Please renew at ${this.configService.get<string>(
        'FRONTEND_URL',
        'https://app.healthcarevision.com',
      )}/subscription`,
    });
  }
}
