import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationLogsService } from '../../application/services/notification-logs.service';
import { NotificationsService } from '../../application/services/notifications.service';
import { NotificationLogsRepository } from '../../infrastructure/repositories/notifications/notification-logs.repository';
import { NotificationsRepository } from '../../infrastructure/repositories/notifications/notifications.repository';
import { NotificationsController } from '../../presentation/controllers/notifications/notifications.controller';
import { NotificationService } from '../../shared/services/notification.service';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { AlertsModule } from '../alerts/alerts.module';
import { PaymentModule } from '../payment/payment.module';
import { PaymentNotificationListener } from './payment-notification.listener';
import { PaymentSuccessNotificationListener } from './payment-success.listener';

@Module({
  imports: [AlertsModule, EventEmitterModule, PaymentModule, ActivityLogsModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsRepository,
    NotificationsService,
    NotificationLogsRepository,
    NotificationLogsService,
    NotificationService,
    PaymentNotificationListener,
    PaymentSuccessNotificationListener,
  ],
  exports: [NotificationsService, NotificationLogsService, NotificationService],
})
export class NotificationsModule {}
