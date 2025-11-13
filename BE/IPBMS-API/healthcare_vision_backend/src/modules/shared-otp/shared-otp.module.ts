import { Module } from '@nestjs/common';
import { OtpUtilityService } from '../../shared/utils/otp-utility.service';

@Module({
  providers: [OtpUtilityService],
  exports: [OtpUtilityService],
})
export class SharedModule {}
