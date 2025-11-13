import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { FcmModule } from '../fcm/fcm.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { RenewalNotificationService } from './renewal-notification.service';
import { RenewalNotificationScheduler } from './renewal-notification.scheduler';
import { QuotaWarningService } from './quota-warning.service';
import { QuotaWarningScheduler } from './quota-warning.scheduler';

@Module({
  imports: [PrismaModule, FcmModule, ActivityLogsModule],
  providers: [
    RenewalNotificationService,
    RenewalNotificationScheduler,
    QuotaWarningService,
    QuotaWarningScheduler,
  ],
  exports: [
    RenewalNotificationService,
    RenewalNotificationScheduler,
    QuotaWarningService,
    QuotaWarningScheduler,
  ],
})
export class SubscriptionNotificationsModule {}
