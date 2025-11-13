import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import {
  FcmAdminService,
  FcmCoreService,
  FcmNotificationService,
  FcmTokenService,
} from '../../application/services/fcm';
import { FcmTokenCleanupScheduler } from '../../application/services/fcm-token-cleanup.scheduler';
import { FcmService } from '../../application/services/fcm.service';
import { FcmController } from '../../presentation/controllers/notifications/fcm.controller';
import { MonitoringService } from '../../shared/services/monitoring.service';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { CaregiverInvitationsModule } from '../caregiver-invitations/caregiver-invitations.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { NotificationEventsModule } from '../notification-events/notification-events.module';
import { NotificationPreferencesModule } from '../notification-preferences/notification-preferences.module';
import { RepositoriesModule } from '../repositories.module';
import { NotificationFcmListener } from './listeners/notification-fcm.listener';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule,
    CaregiverInvitationsModule,
    FirebaseModule,
    NotificationPreferencesModule,
    ActivityLogsModule,
    RepositoriesModule,
    NotificationEventsModule,
  ],
  controllers: [FcmController],
  providers: [
    FcmService,
    MonitoringService,
    // Specialized FCM services
    FcmCoreService,
    FcmTokenService,
    FcmNotificationService,
    FcmAdminService,
    // FCM Token cleanup scheduler
    FcmTokenCleanupScheduler,
    NotificationFcmListener,
    // Preserve legacy global init provider here so AppModule doesn't need to manage it
    {
      provide: 'GLOBAL_FCM_INIT',
      useFactory: (fcmService: FcmService) => {
        (global as any).fcmServiceInstance = fcmService;
        return true;
      },
      inject: [FcmService],
    },
  ],
  // Export the core FCM artifacts so other modules (eg AppModule schedulers)
  // can inject FcmCoreService / FcmNotificationService when provided from
  // the FCM module.
  exports: [
    FcmService,
    FcmCoreService,
    FcmNotificationService,
    FcmTokenService,
    FcmAdminService,
    // Ticket notification/listener providers live in a dedicated integration
    // module (tickets-notifications.module.ts) to avoid circular module
    // dependencies between FcmModule and TicketsModule.
  ],
})
export class FcmModule {}
