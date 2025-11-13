import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { EmailTemplateService } from './email-template.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter;

  constructor(private readonly emailTemplateService: EmailTemplateService) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendMail(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: `"Healthcare VisionAI" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`✅ Email sent to ${to}`);
      return { success: true };
    } catch (err: any) {
      this.logger.error(`❌ Failed to send email: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async sendSubscriptionExpiryNotice(
    to: string,
    name: string,
    plan: string,
    expiryDate: Date,
    daysLeft?: number,
  ) {
    try {
      let status: string;
      let message: string;
      let content: string;

      if (daysLeft === 0) {
        status = 'Gia hạn';
        message = 'đã hết hạn hôm nay';
        content = `Chúng tôi xin thông báo gói dịch vụ ${plan} của Quý khách đã hết hạn vào ngày ${expiryDate.toDateString()}. Để tránh gián đoạn trong quá trình sử dụng, Quý khách vui lòng tiến hành gia hạn ngay hôm nay.`;
      } else {
        status = 'Nhắc nhở';
        message = `sẽ hết hạn trong ${daysLeft} ngày`;
        content = `Chúng tôi xin thông báo gói dịch vụ ${plan} của Quý khách sẽ hết hạn sau ${daysLeft} ngày, tức vào ngày ${expiryDate.toDateString()}. Quý khách vui lòng xem xét gia hạn để đảm bảo dịch vụ được duy trì liên tục, không bị gián đoạn.`;
      }

      const template = await this.emailTemplateService.renderTemplate('subscription_expiry', {
        userName: name,
        planName: plan,
        expiryDate: expiryDate.toDateString(),
        daysLeft: daysLeft?.toString() || '0',
        content,
        status,
        message,
        renewalUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      });

      await this.transporter.sendMail({
        from: `"Healthcare VisionAI" <${process.env.SMTP_USER}>`,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      this.logger.log(`✅ Subscription expiry notice sent to ${to}`);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `❌ Failed to send subscription expiry notice: ${(error as Error).message}`,
      );
      return { success: false, error: (error as Error).message };
    }
  }
}
