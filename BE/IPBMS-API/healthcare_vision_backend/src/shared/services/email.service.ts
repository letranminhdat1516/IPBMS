import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { EmailTemplateService } from '../../application/services/email-template.service';

export interface EmailTemplate {
  subject: string;
  html?: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter!: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpConfig = {
      host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get('SMTP_PORT', 587),
      secure: this.configService.get('SMTP_SECURE', false),
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    };

    this.transporter = nodemailer.createTransport(smtpConfig);

    this.scheduleVerify();
  }

  private scheduleVerify(): void {
    if (!this.shouldVerifyOnBoot()) {
      this.logger.debug('Skipping SMTP verification at startup');
      return;
    }

    setTimeout(async () => {
      try {
        await this.transporter.verify();
        this.logger.log('SMTP connection verified successfully');
      } catch (error) {
        this.logger.error('SMTP connection verification failed:', error);
      }
    }, 0);
  }

  private shouldVerifyOnBoot(): boolean {
    const explicit = this.configService.get<string | boolean>('SMTP_VERIFY_ON_BOOT');
    if (typeof explicit === 'boolean') {
      return explicit;
    }

    if (typeof explicit === 'string') {
      return ['true', '1', 'yes', 'on'].includes(explicit.toLowerCase());
    }

    const env = this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development';
    return env === 'production';
  }

  async sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get('SMTP_FROM', 'noreply@yourapp.com'),
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${to}: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  // Password reset email template
  async createPasswordResetTemplate(
    emailTemplateService: EmailTemplateService,
    resetToken: string,
    userName: string,
  ): Promise<EmailTemplate> {
    const resetUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`;

    return emailTemplateService.renderTemplate('password_reset', {
      userName,
      resetUrl,
    });
  }

  // Welcome email template
  async createWelcomeTemplate(
    emailTemplateService: EmailTemplateService,
    userName: string,
  ): Promise<EmailTemplate> {
    const appUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');

    return emailTemplateService.renderTemplate('welcome', {
      userName,
      appUrl,
    });
  }

  // Security alert email template
  async createSecurityAlertTemplate(
    emailTemplateService: EmailTemplateService,
    userName: string,
    action: string,
    details: string,
  ): Promise<EmailTemplate> {
    const settingsUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/settings/security`;

    return emailTemplateService.renderTemplate('security_alert', {
      userName,
      action,
      details,
      timestamp: new Date().toLocaleString(),
      settingsUrl,
    });
  }
}
