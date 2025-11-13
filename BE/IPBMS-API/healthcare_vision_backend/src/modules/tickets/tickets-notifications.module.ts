import { Module } from '@nestjs/common';
import { TicketNotificationService } from '../../application/services/fcm/ticket-notification.service';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { FcmModule } from '../fcm/fcm.module';
import { NotificationFcmListener } from '../fcm/listeners/notification-fcm.listener';
import { NotificationEventsModule } from '../notification-events/notification-events.module';
import { NotificationPreferencesModule } from '../notification-preferences/notification-preferences.module';

@Module({
  imports: [FcmModule, NotificationEventsModule, NotificationPreferencesModule, ActivityLogsModule],
  providers: [TicketNotificationService, NotificationFcmListener],
  exports: [TicketNotificationService],
})
export class TicketsNotificationsModule {}
