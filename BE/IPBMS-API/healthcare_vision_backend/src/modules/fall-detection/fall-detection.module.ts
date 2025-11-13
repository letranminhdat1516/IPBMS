import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { TwilioVoiceService } from '../../infrastructure/external-apis/twilio/twilio-voice.service';
// FallDetectionController endpoints moved to EventsController
import { FallDetectionService } from '../../application/services/fall-detection.service';
import { FallDetectionScheduler } from '../../infrastructure/cron/fall-detection.cron';
import { FcmModule } from '../fcm/fcm.module';
import { RepositoriesModule } from '../repositories.module';

@Module({
  imports: [ScheduleModule.forRoot(), FcmModule, RepositoriesModule],
  controllers: [], // FallDetectionController endpoints moved to EventsController
  providers: [FallDetectionService, TwilioVoiceService, FallDetectionScheduler],
  exports: [FallDetectionService],
})
export class FallsModule {}
