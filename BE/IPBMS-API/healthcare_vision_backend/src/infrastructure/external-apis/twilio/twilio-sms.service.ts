import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioSmsService {
  private readonly logger = new Logger(TwilioSmsService.name);
  private readonly client: Twilio;

  constructor(private readonly config: ConfigService) {
    const sid = this.config.getOrThrow<string>('TWILIO_ACCOUNT_SID');
    const token = this.config.getOrThrow<string>('TWILIO_AUTH_TOKEN');
    this.client = new Twilio(sid, token);
  }

  formatE164(phone: string): string {
    let p = phone.trim().replace(/[^\d+]/g, '');
    if (/^\+84\d{9}$/.test(p)) return p;
    if (/^84\d{9}$/.test(p)) return `+${p}`;
    if (/^0\d{9}$/.test(p)) return `+84${p.slice(1)}`;
    if (/^\+\d{9,15}$/.test(p)) return p;
    return p;
  }

  async sendOtpSms(
    phoneNumber: string,
    otpCode: string,
  ): Promise<{ success: boolean; call_id?: string; error?: string }> {
    const to = this.formatE164(phoneNumber);
    const from = this.config.get<string>('TWILIO_PHONE_NUMBER');
    const body = `Mã xác thực Healthcare Vision: ${otpCode}.`;

    this.logger.log(`Attempting to send OTP SMS to=${to} from=${from}`);

    const maxAttempts = Number(this.config.get<number>('TWILIO_RETRY_ATTEMPTS') ?? 2);
    const baseDelayMs = 500;
    let lastErr: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.debug(`🔄 [TWILIO_SMS] Attempt ${attempt}/${maxAttempts} to send SMS to ${to}`);
        const msg = await this.client.messages.create({ body, to, from });
        this.logger.log(
          `✅ [TWILIO_SMS] SMS sent successfully! SID=${msg.sid} to=${to} from=${from}`,
        );
        this.logger.log(`📊 [TWILIO_SMS] SMS status: ${msg.status}, cost: ${msg.price || 'N/A'}`);
        return { success: true, call_id: msg.sid };
      } catch (err) {
        lastErr = err;
        this.logger.error(
          `❌ [TWILIO_SMS] Attempt ${attempt}/${maxAttempts} failed: ${String(err)}`,
        );
        if (attempt < maxAttempts) {
          const wait = baseDelayMs * Math.pow(2, attempt - 1);
          this.logger.log(`⏳ [TWILIO_SMS] Waiting ${wait}ms before retry...`);
          await new Promise((res) => setTimeout(res, wait));
        }
      }
    }

    // All attempts failed
    this.logger.error(`💥 [TWILIO_SMS] All ${maxAttempts} attempts failed to send SMS to ${to}`);
    this.logger.error(`🚨 [TWILIO_SMS] Final error: ${String(lastErr ?? 'unknown error')}`);
    this.logger.log(`🔄 [TWILIO_SMS] Will fallback to Firebase Phone Authentication for ${to}`);
    return { success: false, error: String(lastErr ?? 'unknown error') };
  }

  async sendText(
    phoneNumber: string,
    text: string,
  ): Promise<{ success: boolean; call_id?: string; error?: string }> {
    const to = this.formatE164(phoneNumber);
    const from = this.config.get<string>('TWILIO_PHONE_NUMBER');
    this.logger.log(`📤 [TWILIO_SMS] Attempting to send text to=${to} from=${from}`);
    try {
      const msg = await this.client.messages.create({ body: text, to, from });
      this.logger.log(`✅ [TWILIO_SMS] Text sent successfully! SID=${msg.sid} to=${to}`);
      return { success: true, call_id: msg.sid };
    } catch (err) {
      this.logger.error(`❌ [TWILIO_SMS] Text send failed: ${String(err)}`);
      return { success: false, error: String(err) };
    }
  }
}
