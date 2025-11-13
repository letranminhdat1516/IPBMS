import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushNotificationScheduler } from './application/services/push-notification.scheduler';
import { PatientMedicalRecordsService } from './application/services/users/patient-medical-records.service';
import { appConfig } from './config/app.config';
import { createTypeOrmConfig } from './infrastructure/database/database.config';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { RepositoriesModule } from './infrastructure/repositories/repositories.module';
import { AccessControlModule } from './modules/access-control/access-control.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module';
import { AdminNotificationDefaultsModule } from './modules/admin-notification-defaults/admin-notification-defaults.module';
import { AdminPlansModule } from './modules/admin-plans/admin-plans.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { AiConfigurationsModule } from './modules/ai-configurations/ai-configurations.module';
import { AiProcessingLogsModule } from './modules/ai-processing-logs/ai-processing-logs.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { CacheModule } from './modules/cache/cache.module';
import { CameraSettingsModule } from './modules/camera-settings/camera-settings.module';
import { CamerasModule } from './modules/cameras/cameras.module';
import { CaregiverInvitationsModule } from './modules/caregiver-invitations/caregiver-invitations.module';
import { CaregiversModule } from './modules/caregivers/caregivers.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DailySummariesModule } from './modules/daily-summaries/daily-summaries.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DeviceSyncModule } from './modules/device-sync/device-sync.module';
import { EmailTemplateModule } from './modules/email-templates/email-template.module';
import { EmergencyContactsModule } from './modules/emergency-contacts/emergency-contacts.module';
import { EventsModule } from './modules/events/events.module';
import { FallsModule } from './modules/fall-detection/fall-detection.module';
import { FcmModule } from './modules/fcm/fcm.module';
import { FirebaseModule } from './modules/firebase/firebase.module';
import { HealthReportModule } from './modules/health-report/health-report.module';
import { MailModule } from './modules/mail/mail.module';
import { NotificationEventsModule } from './modules/notification-events/notification-events.module';
import { NotificationPreferencesModule } from './modules/notification-preferences/notification-preferences.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentModule } from './modules/payment/payment.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { QuotaModule } from './modules/quota/quota.module';
import { RolesModule } from './modules/roles/roles.module';
import { SearchModule } from './modules/search/search.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SharedPermissionsModule } from './modules/shared-permissions/shared-permissions.module';
import { SnapshotsModule } from './modules/snapshots/snapshots.module';
import { SubscriptionNotificationsModule } from './modules/subscription-notifications/subscription-notifications.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { SuggestionsModule } from './modules/suggestions/suggestions.module';
import { ThreadMemoryModule } from './modules/thread-memory/thread-memory.module';
import { TicketsNotificationsModule } from './modules/tickets/tickets-notifications.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UserRoomAssignmentsModule } from './modules/user-room-assignments/user-room-assignments.module';
import { UsersModule } from './modules/users/users.module';
import { AppController } from './presentation/controllers/app.controller';
import { LogActivityInterceptor } from './shared/interceptors/activity-logging.interceptor';
import { CacheControlInterceptor } from './shared/interceptors/cache-control.interceptor';
import { ResponseWrapperInterceptor } from './shared/interceptors/response-wrapper.interceptor';
import { EventEscalationWorker } from './workers/event-escalation.worker';
import { SubscriptionSchedulerWorker } from './workers/subscription-scheduler.worker';

@Module({
  imports: [
    // 1) Platform / config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env', `.env.${process.env.NODE_ENV || 'development'}`],
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 50,
    }),
    ScheduleModule.forRoot(),

    // 2) Infrastructure (DB)
    PrismaModule,
    RepositoriesModule,
    TypeOrmModule.forRootAsync({
      useFactory: createTypeOrmConfig,
      inject: [ConfigService],
    }),

    // 3) Core modules
    AuthModule,
    SettingsModule,
    UsersModule,

    // 4) AI / Monitoring / Camera
    AiConfigurationsModule,
    AiProcessingLogsModule,
    SuggestionsModule,
    CameraSettingsModule,
    CamerasModule,
    CloudinaryModule,
    EventsModule,
    HealthReportModule,
    // ImageSettingsModule,
    NotificationPreferencesModule,
    NotificationEventsModule,
    SnapshotsModule,
    ThreadMemoryModule,
    UploadsModule,
    FallsModule,

    // 5) Care workflow
    AccessControlModule,
    ActivityLogsModule,
    AdminDashboardModule,
    AuditModule,
    CaregiverInvitationsModule,
    CaregiversModule,
    CustomersModule,
    DashboardModule,
    DailySummariesModule,
    TicketsModule,
    TicketsNotificationsModule,
    UserRoomAssignmentsModule,

    // 6) Alerts / Notifications
    AlertsModule,
    DeviceSyncModule,
    FirebaseModule,
    FcmModule,
    NotificationsModule,
    EmergencyContactsModule,
    EmailTemplateModule,
    MailModule,

    // 7) Billing / Admin
    AdminNotificationDefaultsModule,
    AdminPlansModule,
    AdminUsersModule,
    BillingModule,
    CacheModule,
    PaymentModule,
    QuotaModule,
    RolesModule,
    SearchModule,
    SharedPermissionsModule,
    SubscriptionModule,
    SubscriptionNotificationsModule,
    PermissionsModule,
  ],
  controllers: [AppController], // Root controller only; other controllers are provided by their modules
  providers: [
    // Interceptors (global order: cache → activity log → response wrapper)
    { provide: APP_INTERCEPTOR, useClass: CacheControlInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LogActivityInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseWrapperInterceptor },

    // Standalone services / workers
    PatientMedicalRecordsService,
    PushNotificationScheduler,
    SubscriptionSchedulerWorker,
    EventEscalationWorker,
  ],
})
export class AppModule {}
