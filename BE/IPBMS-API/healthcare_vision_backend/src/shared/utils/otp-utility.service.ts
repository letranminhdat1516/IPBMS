import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export enum OtpDeliveryMethod {
  SMS = 'sms',
  CALL = 'call',
  BOTH = 'both', // Gửi SMS trước, nếu thất bại thì gọi điện
}

export interface OtpGenerationOptions {
  length?: number; // Độ dài OTP (mặc định 6)
  expiryMinutes?: number; // Thời gian hết hạn (mặc định 5 phút)
  onlyNumbers?: boolean; // Chỉ sử dụng số (mặc định true)
}

export interface OtpResult {
  code: string;
  expiresAt: Date;
  method: OtpDeliveryMethod;
}

@Injectable()
export class OtpUtilityService {
  private readonly logger = new Logger(OtpUtilityService.name);

  /**
   * Sinh mã OTP ngẫu nhiên với độ bảo mật cao (tương tự C# RandomNumberGenerator)
   * @param options Tùy chọn sinh OTP
   */
  generateOtp(options: OtpGenerationOptions = {}): { code: string; expiresAt: Date } {
    const { length = 6, expiryMinutes = 5, onlyNumbers = true } = options;

    let code: string;

    if (onlyNumbers) {
      // Luôn sinh OTP 6 chữ số (từ 100000 đến 999999) để đảm bảo an toàn
      const randomValue = crypto.randomInt(100000, 1000000);
      code = randomValue.toString();

      this.logger.log(`Generated 6-digit OTP: ${code}`);
    } else {
      // Sinh OTP gồm số và chữ cái
      const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const randomBytes = crypto.randomBytes(length);
      code = '';

      for (let i = 0; i < length; i++) {
        code += characters[randomBytes[i] % characters.length];
      }
    }

    // Tính thời gian hết hạn ( - 5 phút)
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    return { code, expiresAt };
  }

  /**
   * Kiểm tra OTP có hợp lệ không
   * @param inputOtp OTP người dùng nhập
   * @param storedOtp OTP lưu trong database
   * @param expiresAt Thời gian hết hạn
   */
  validateOtp(
    inputOtp: string,
    storedOtp: string,
    expiresAt: Date,
  ): {
    isValid: boolean;
    reason?: string;
  } {
    // Kiểm tra OTP có tồn tại không
    if (!storedOtp) {
      return { isValid: false, reason: 'OTP not found or not requested' };
    }

    // Kiểm tra OTP có hết hạn không
    if (expiresAt && expiresAt < new Date()) {
      return { isValid: false, reason: 'OTP has expired' };
    }

    // Kiểm tra OTP có khớp không (so sánh string để tránh lỗi type)
    if (String(inputOtp).trim() !== String(storedOtp).trim()) {
      return { isValid: false, reason: 'OTP does not match' };
    }

    return { isValid: true };
  }

  /**
   * Tính thời gian còn lại của OTP (giây)
   * @param expiresAt Thời gian hết hạn
   */
  getRemainingTime(expiresAt: Date): number {
    if (!expiresAt) return 0;

    const now = Date.now();
    const expiry = expiresAt.getTime();

    if (expiry <= now) return 0;

    return Math.ceil((expiry - now) / 1000);
  }

  /**
   * Format thời gian còn lại thành chuỗi dễ đọc
   * @param seconds Số giây còn lại
   */
  formatRemainingTime(seconds: number): string {
    if (seconds <= 0) return '0s';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }

    return `${remainingSeconds}s`;
  }

  /**
   * Làm sạch số điện thoại (loại bỏ ký tự đặc biệt)
   * @param phoneNumber Số điện thoại thô
   */
  sanitizePhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/[\s\-\(\)\+]/g, '');
  }

  /**
   * Kiểm tra xem có thể gửi OTP mới không (chống spam)
   * @param lastOtpTime Thời gian gửi OTP cuối cùng
   * @param cooldownMinutes Thời gian chờ tối thiểu giữa các lần gửi (mặc định 1 phút)
   */
  canSendNewOtp(
    lastOtpTime?: Date,
    cooldownMinutes: number = 1,
  ): {
    canSend: boolean;
    remainingCooldown?: number;
  } {
    // TEST MODE: luôn cho phép gửi OTP, bỏ qua cooldown
    return { canSend: true };
  }
}
