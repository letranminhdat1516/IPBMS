import { Module } from '@nestjs/common';
import { TwilioVoiceService } from '../../infrastructure/external-apis/twilio/twilio-voice.service';
import { TwilioSmsService } from '../../infrastructure/external-apis/twilio/twilio-sms.service';

@Module({
  providers: [TwilioSmsService, TwilioVoiceService],
  exports: [TwilioSmsService, TwilioVoiceService],
})
export class TwilioModule {}
