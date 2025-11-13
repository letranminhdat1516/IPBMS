import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StringeeSmsService } from '../../infrastructure/external-apis/stringee/stringee-sms.service';
import { StringeeCallService } from '../../infrastructure/external-apis/stringee/stringee-call.service';

@Module({
  imports: [ConfigModule],
  providers: [StringeeSmsService, StringeeCallService],
  exports: [StringeeSmsService, StringeeCallService],
})
export class StringeeModule {}
