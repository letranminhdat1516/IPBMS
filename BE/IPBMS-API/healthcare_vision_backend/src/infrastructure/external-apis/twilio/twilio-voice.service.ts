import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioVoiceService {
  private readonly logger = new Logger(TwilioVoiceService.name);
  private readonly client: Twilio;

  constructor(private readonly config: ConfigService) {
    const sid = this.config.getOrThrow<string>('TWILIO_ACCOUNT_SID');
    const token = this.config.getOrThrow<string>('TWILIO_AUTH_TOKEN');
    this.client = new Twilio(sid, token);
  }

  private formatE164(phone: string): string {
    const p = phone.trim().replace(/[^\d+]/g, '');
    if (/^\+84\d{9}$/.test(p)) return p;
    if (/^84\d{9}$/.test(p)) return `+${p}`;
    if (/^0\d{9}$/.test(p)) return `+84${p.slice(1)}`;
    return p;
  }

  async callOtp(phoneNumber: string, otpCode: string): Promise<boolean> {
    const to = this.formatE164(phoneNumber);
    const from = this.config.getOrThrow<string>('TWILIO_PHONE_NUMBER');

    const digits = otpCode.split('').join(', ');
    const msg = `Mã xác thực của bạn là: ${digits}. Nhập mã để tiếp tục.`;

    const twiml = `
<Response>
  <Say voice="Google.vi-VN-Wavenet-B" language="vi-VN">${msg}</Say>
  <Pause length="1"/>
  <Say voice="Google.vi-VN-Wavenet-B" language="vi-VN">Tôi nhắc lại. ${msg}</Say>
  <Pause length="1"/>
  <Say voice="Google.vi-VN-Wavenet-B" language="vi-VN">Lần cuối. ${msg}</Say>
</Response>`.trim();

    this.logger.debug(`To=${to}`);
    this.logger.debug(`TwiML=${twiml}`);

    try {
      const call = await this.client.calls.create({
        from,
        to,
        twiml,
        record: true,
      });
      this.logger.log(`Voice OTP call SID=${call.sid}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Voice OTP error: ${err.message}`);
      return false;
    }
  }

  async callEmergencyVn(toPhone: string, rawMessage: string): Promise<boolean> {
    const to = this.formatE164(toPhone);
    const from = this.config.getOrThrow<string>('TWILIO_PHONE_NUMBER');
    const callbackUrl = this.config.getOrThrow<string>('TWILIO_CALLBACK_CONFIRM_URL');

    const message = rawMessage.trim();
    const finalMessage = `
      Cảnh báo khẩn cấp từ hệ thống Healthcare Vision. 
      ${message}.
      Xin hãy kiểm tra người thân ngay lập tức.
    `
      .trim()
      .replace(/\s+/g, ' ');

    const twiml = `
<Response>
  <Gather input="dtmf" timeout="10" numDigits="1" action="${callbackUrl}" method="POST">
    <Say voice="Google.vi-VN-Wavenet-B" language="vi-VN">
      Đây là cuộc gọi cảnh báo khẩn cấp từ hệ thống Healthcare Vision. 
      Hệ thống vừa phát hiện một chuỗi hành vi bất thường của người thân bạn. 
      Nếu bạn đã nhận được cuộc gọi và sẽ kiểm tra tình trạng của người thân, vui lòng nhấn phím 2 ngay bây giờ để xác nhận.
    </Say>
  </Gather>
  <Say voice="Google.vi-VN-Wavenet-B" language="vi-VN">
    Tôi nhắc lại. Đây là cảnh báo khẩn cấp từ hệ thống Healthcare Vision. 
    Nếu bạn sẽ kiểm tra tình trạng của người thân, hãy nhấn phím 2 để xác nhận.
  </Say>
  <Say voice="Google.vi-VN-Wavenet-B" language="vi-VN">
    Lần cuối cùng. Nếu bạn đã tiếp nhận cảnh báo và sẽ kiểm tra người thân, vui lòng nhấn phím 2 ngay bây giờ để xác nhận.
  </Say>
</Response>
`.trim();

    this.logger.debug(`📞 Gọi khẩn cấp đến: ${to}`);
    this.logger.debug(`🗣️ TwiML: ${twiml}`);

    try {
      const call = await this.client.calls.create({
        from,
        to,
        twiml,
        record: true,
        statusCallback: callbackUrl,
        statusCallbackMethod: 'POST',
        statusCallbackEvent: ['answered'],
      });

      this.logger.log(`Cuộc gọi khẩn cấp SID=${call.sid} đã được tạo.`);
      return true;
    } catch (err: any) {
      this.logger.error(`Gọi khẩn cấp lỗi: ${err?.message || err}`);
      return false;
    }
  }
}
