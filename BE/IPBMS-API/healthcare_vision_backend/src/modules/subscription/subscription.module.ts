import { Module } from '@nestjs/common';
import { SubscriptionEventsService } from '../../application/services/subscription';
import { SubscriptionReminderService } from '../../application/services/subscription';
import { SubscriptionService } from '../../application/services/subscription';
import { SubscriptionDowngradeService } from '../../application/services/subscription/subscription-downgrade.service';
import { SubscriptionExpiredListener } from '../../application/services/subscription/subscription-expired.listener';
import { SubscriptionMetricsService } from '../../application/services/subscription/subscription-metrics.service';
import { SubscriptionPaymentListener } from '../../application/services/subscription/subscription-payment.listener';
import { SubscriptionUpgradeService } from '../../application/services/subscription/subscription-upgrade.service';
import { SubscriptionReminderCron } from '../../infrastructure/cron/subscription-email-reminder.cron';
import { SubscriptionRenewalCron } from '../../infrastructure/cron/subscription-renewal.cron';
import { PlanRepository } from '../../infrastructure/repositories/admin/plan.repository';
import { PaymentRepository } from '../../infrastructure/repositories/payments/payment.repository';
import { SubscriptionEventRepository } from '../../infrastructure/repositories/payments/subscription-event.repository';
import { SubscriptionRepository } from '../../infrastructure/repositories/payments/subscription.repository';
import { TransactionRepository } from '../../infrastructure/repositories/payments/transaction.repository';
import { PlanController } from '../../presentation/controllers/payments/plans.controller';
import { SubscriptionController } from '../../presentation/controllers/payments/subscriptions.controller';
import { AdminPlansModule } from '../admin-plans/admin-plans.module';
import { AlertsModule } from '../alerts/alerts.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentModule } from '../payment/payment.module';
import { QuotaModule } from '../quota/quota.module';
import { SettingsModule } from '../settings/settings.module';
import { SharedPermissionsModule } from '../shared-permissions/shared-permissions.module';

@Module({
  imports: [
    MailModule,
    SettingsModule,
    AlertsModule,
    NotificationsModule,
    PaymentModule,
    QuotaModule,
    AdminPlansModule,
    SharedPermissionsModule,
  ],
  controllers: [SubscriptionController, PlanController],
  providers: [
    SubscriptionService,
    SubscriptionReminderService,
    SubscriptionEventsService,
    SubscriptionPaymentListener,
    SubscriptionRepository,
    TransactionRepository,
    PaymentRepository,
    PlanRepository,
    SubscriptionEventRepository,
    SubscriptionUpgradeService,
    SubscriptionDowngradeService,
    SubscriptionReminderCron,
    SubscriptionRenewalCron,
    SubscriptionExpiredListener,
    SubscriptionMetricsService,
  ],
  exports: [
    SubscriptionService,
    SubscriptionReminderService,
    SubscriptionEventsService,
    SubscriptionMetricsService,
  ],
})
export class SubscriptionModule {}
