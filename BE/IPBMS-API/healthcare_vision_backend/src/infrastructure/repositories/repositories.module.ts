import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UnitOfWork } from '../database/unit-of-work.service';
import { PlanRepository } from './admin/plan.repository';
import { QuotaRepository } from './admin/quota.repository';
import { EventsRepository } from './events/events.repository';
import { AlertsRepository } from './notifications/alerts.repository';
import { FcmTokenRepository } from './notifications/fcm-token.repository';
import { PatientSleepCheckinsRepository } from './users/patient-sleep-checkins.repository';
import { PaymentRepository } from './payments/payment.repository';
import { SubscriptionEventRepository } from './payments/subscription-event.repository';
import { SubscriptionRepository } from './payments/subscription.repository';
import { TransactionRepository } from './payments/transaction.repository';
import { PermissionsRepository } from './permissions/permissions.repository';
import { RolesRepository } from './permissions/roles.repository';
import { DashboardRepository } from './reports/dashboard.repository';
import { ActivityLogsRepository } from './shared/activity-logs.repository';
import { SystemConfigRepository } from './system/system-config.repository';
import { CustomersRepository } from './users/customers.repository';
import { UserPreferencesRepository } from './users/user-preferences.repository';
import { UsersRepository } from './users/users.repository';

@Module({
  providers: [
    ActivityLogsRepository,
    AlertsRepository,
    CustomersRepository,
    DashboardRepository,
    EventsRepository,
    FcmTokenRepository,
    PlanRepository,
    PaymentRepository,
    PatientSleepCheckinsRepository,
    PermissionsRepository,
    PrismaService,
    QuotaRepository,
    RolesRepository,
    SubscriptionEventRepository,
    SubscriptionRepository,
    SystemConfigRepository,
    TransactionRepository,
    UnitOfWork,
    UserPreferencesRepository,
    UsersRepository,
  ],
  exports: [
    ActivityLogsRepository,
    AlertsRepository,
    CustomersRepository,
    DashboardRepository,
    EventsRepository,
    FcmTokenRepository,
    PlanRepository,
    PaymentRepository,
    PatientSleepCheckinsRepository,
    PermissionsRepository,
    QuotaRepository,
    RolesRepository,
    SubscriptionEventRepository,
    SubscriptionRepository,
    SystemConfigRepository,
    TransactionRepository,
    UserPreferencesRepository,
    UsersRepository,
  ],
})
export class RepositoriesModule {}
