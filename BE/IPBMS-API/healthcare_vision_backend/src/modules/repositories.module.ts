import { Module } from '@nestjs/common';
import { UnitOfWork } from '../infrastructure/database/unit-of-work.service';
import { AdminPlansRepository } from '../infrastructure/repositories/admin/admin-plans.repository';
import { PlanRepository } from '../infrastructure/repositories/admin/plan.repository';
import { FallDetectionRepository } from '../infrastructure/repositories/ai/fall-detection.repository';
import { CamerasRepository } from '../infrastructure/repositories/devices/cameras.repository';
import { EventConfirmationRepository } from '../infrastructure/repositories/events/event-confirmation.repository';
import { EventsRepository } from '../infrastructure/repositories/events/events.repository';
import { FcmTokenRepository } from '../infrastructure/repositories/notifications/fcm-token.repository';
import { PaymentRepository } from '../infrastructure/repositories/payments/payment.repository';
import { SubscriptionEventRepository } from '../infrastructure/repositories/payments/subscription-event.repository';
import { SubscriptionRepository } from '../infrastructure/repositories/payments/subscription.repository';
import { TransactionRepository } from '../infrastructure/repositories/payments/transaction.repository';
import { ActivityLogsRepository } from '../infrastructure/repositories/shared/activity-logs.repository';
import { SystemConfigRepository } from '../infrastructure/repositories/system/system-config.repository';
import { AssignmentsRepository } from '../infrastructure/repositories/users/assignments.repository';
import { CustomersRepository } from '../infrastructure/repositories/users/customers.repository';
import { PatientSleepCheckinsRepository } from '../infrastructure/repositories/users/patient-sleep-checkins.repository';
import { UserPreferencesRepository } from '../infrastructure/repositories/users/user-preferences.repository';
import { UsersRepository } from '../infrastructure/repositories/users/users.repository';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [SettingsModule],
  providers: [
    UnitOfWork,
    SubscriptionRepository,
    TransactionRepository,
    PaymentRepository,
    PlanRepository,
    SubscriptionEventRepository,
    ActivityLogsRepository,
    FcmTokenRepository,
    SystemConfigRepository,
    EventsRepository,
    UsersRepository,
    CustomersRepository,
    AssignmentsRepository,
    AdminPlansRepository,
    FallDetectionRepository,
    UserPreferencesRepository,
    EventConfirmationRepository,
    PatientSleepCheckinsRepository,
    CamerasRepository,
  ],
  exports: [
    SubscriptionRepository,
    TransactionRepository,
    PaymentRepository,
    PlanRepository,
    SubscriptionEventRepository,
    ActivityLogsRepository,
    FcmTokenRepository,
    SystemConfigRepository,
    EventsRepository,
    UsersRepository,
    CustomersRepository,
    AssignmentsRepository,
    AdminPlansRepository,
    FallDetectionRepository,
    UserPreferencesRepository,
    EventConfirmationRepository,
    PatientSleepCheckinsRepository,
    CamerasRepository,
  ],
})
export class RepositoriesModule {}
