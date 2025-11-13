import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class StringeeSmsService {
  private readonly logger = new Logger(StringeeSmsService.name);
  private readonly baseUrl = 'https://api.stringee.com/v1/sms/send';
  private readonly accessToken: string;

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.get<string>('STRINGEE_ACCESS_TOKEN') || '';
  }

  /**
   * Gửi SMS OTP qua Stringee
   * @param phoneNumber Số điện thoại (định dạng +84xxxxxxxxx)
   * @param otpCode Mã OTP 6 số
   */
  async sendOtpSms(phoneNumber: string, otpCode: string): Promise<boolean> {
    try {
      // Chuẩn hóa số điện thoại về định dạng quốc tế
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const smsContent = `Ma xac thuc Healthcare Vision cua ban la: ${otpCode}. Ma co hieu luc trong 5 phut. Khong chia se ma nay cho bat ky ai.`;

      const payload = {
        to: [formattedPhone],
        message: smsContent,
        access_token: this.accessToken,
      };

      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 giây timeout
      });

      if (response.data && response.data.r === 0) {
        this.logger.log(`SMS sent successfully to ${formattedPhone}`);
        return true;
      } else {
        this.logger.error(`SMS sending failed: ${JSON.stringify(response.data)}`);
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Error sending SMS: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Gửi SMS bất kỳ qua Stringee (nội dung đầy đủ)
   * @param phoneNumber định dạng 84xxxxxxxxx
   * @param message nội dung tin nhắn
   */
  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const payload = {
        to: [formattedPhone],
        message: message,
        access_token: this.accessToken,
      };

      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      if (response.data && response.data.r === 0) {
        this.logger.log(`SMS sent successfully to ${formattedPhone}`);
        return true;
      } else {
        this.logger.error(`SMS sending failed: ${JSON.stringify(response.data)}`);
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Error sending SMS: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Chuẩn hóa số điện thoại về định dạng +84xxxxxxxxx
   * @param phoneNumber Số điện thoại đầu vào
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Loại bỏ tất cả ký tự không phải số
    let cleaned = phoneNumber.replace(/\D/g, '');

    // Nếu bắt đầu bằng 84, thêm dấu +
    if (cleaned.startsWith('84')) {
      return `+${cleaned}`;
    }

    // Nếu bắt đầu bằng 0, thay thế bằng +84
    if (cleaned.startsWith('0')) {
      return `+84${cleaned.substring(1)}`;
    }

    // Nếu không có prefix, thêm +84
    if (!cleaned.startsWith('+84')) {
      return `+84${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Kiểm tra định dạng số điện thoại Việt Nam
   * @param phoneNumber Số điện thoại
   */
  isValidVietnamesePhoneNumber(phoneNumber: string): boolean {
    const vnPhoneRegex = /^(\+84|84|0)(3|5|7|8|9)[0-9]{8}$/;
    return vnPhoneRegex.test(phoneNumber.replace(/\s+/g, ''));
  }
}
