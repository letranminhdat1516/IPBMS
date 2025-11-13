import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class StringeeCallService {
  private readonly _logger = new Logger(StringeeCallService.name);
  private readonly callUrl = 'https://api.stringee.com/v1/call2/callout';

  private get authToken() {
    return process.env.STRINGEE_ACCESS_TOKEN || '';
  }
  private get phoneNumber() {
    return process.env.STRINGEE_PHONE_NUMBER || '';
  }
  private get answerUrl() {
    return process.env.STRINGEE_ANSWER_URL || '';
  }

  /**
   * Gọi điện thoại để đọc OTP qua Stringee (đơn giản hóa, chỉ gọi API)
   * @param phoneNumber Số điện thoại (định dạng +84xxxxxxxxx hoặc 84xxxxxxxxx)
   * @param otpCode Mã OTP 6 số
   */
  async callOtpAnnouncement(phoneNumber: string, otpCode: string): Promise<boolean> {
    const body = {
      from: {
        type: 'external',
        number: this.phoneNumber,
        alias: 'STRINGEE_NUMBER',
      },
      to: [
        {
          type: 'external',
          number: phoneNumber,
          alias: 'TO_NUMBER',
        },
      ],
      answer_url: this.answerUrl,
      actions: [
        {
          action: 'talk',
          text: `MÃ XÁC THỰC CỦA BẠN LÀ ${otpCode},NHẮC LẠI MÃ XÁC THỰC CỦA BẠN LÀ ${otpCode}`,
        },
      ],
    };

    try {
      const response = await axios.post(this.callUrl, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-STRINGEE-AUTH': this.authToken,
        },
      });
      this._logger.log(`Sent OTP to ${phoneNumber}. Response: ${JSON.stringify(response.data)}`);
      return true;
    } catch (error: any) {
      this._logger.error('Error sending OTP: ' + (error.response?.data || error.message));
      return false;
    }
  }

  /**
   * Gọi điện thoại và đọc nội dung tuỳ ý
   * @param phoneNumber
   * @param text
   */
  async callAnnouncement(phoneNumber: string, text: string): Promise<boolean> {
    const body = {
      from: {
        type: 'external',
        number: this.phoneNumber,
        alias: 'STRINGEE_NUMBER',
      },
      to: [
        {
          type: 'external',
          number: phoneNumber,
          alias: 'TO_NUMBER',
        },
      ],
      answer_url: this.answerUrl,
      actions: [
        {
          action: 'talk',
          text,
        },
      ],
    };

    try {
      const response = await axios.post(this.callUrl, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-STRINGEE-AUTH': this.authToken,
        },
      });
      this._logger.log(
        `Sent announcement to ${phoneNumber}. Response: ${JSON.stringify(response.data)}`,
      );
      return true;
    } catch (error: any) {
      this._logger.error('Error sending announcement: ' + (error.response?.data || error.message));
      return false;
    }
  }
}
