import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { EventConfirmationService } from '../../application/services/event-confirmation.service';
import { EventDetectionsService } from '../../application/services/event-detections.service';
import { EventValidationService } from '../../application/services/event-validation.service';
import { EventsService } from '../../application/services/events.service';
import { EventAuditLogService } from '../../application/services/events/event-audit-log.service';
import { EventConfirmationAutoApproveCron } from '../../infrastructure/cron/event-confirmation-auto-approve.cron';
import { EventAuditLogRepository } from '../../infrastructure/repositories/events/event-audit-log.repository';
import { EventConfirmationRepository } from '../../infrastructure/repositories/events/event-confirmation.repository';
import { EventDetectionsRepository } from '../../infrastructure/repositories/events/event-detections.repository';
import { EventsRepository } from '../../infrastructure/repositories/events/events.repository';
import { EventDetectionsController } from '../../presentation/controllers/events/detections.controller';
import { EventsController } from '../../presentation/controllers/events/events.controller';
import { EventLogsController } from '../../presentation/controllers/events/logs.controller';
import { EventsVerificationController } from '../../presentation/controllers/events';
import { EventsVerificationService } from '../../application/services/events/events-verification.service';
import { OwnerResolverMiddleware } from '../../shared/middleware/owner-resolver.middleware';
import { AccessControlModule } from '../access-control/access-control.module';
import { CacheModule } from '../cache/cache.module';
import { CaregiversModule } from '../caregivers/caregivers.module';
import { FcmModule } from '../fcm/fcm.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { SharedPermissionsModule } from '../shared-permissions/shared-permissions.module';

@Module({
  imports: [
    SettingsModule,
    FcmModule,
    NotificationsModule,
    CacheModule,
    AccessControlModule,
    SharedPermissionsModule,
    CaregiversModule,
    // Import snapshots module so EventsController can create/attach snapshots when alarm triggered
    require('../snapshots/snapshots.module').SnapshotsModule,
  ],
  controllers: [
    EventsController,
    EventDetectionsController,
    EventLogsController,
    EventsVerificationController,
  ],
  providers: [
    EventsVerificationService,
    EventAuditLogRepository,
    EventsRepository,
    EventsService,
    EventDetectionsRepository,
    EventDetectionsService,
    EventConfirmationRepository,
    EventConfirmationService,
    EventValidationService,
    EventAuditLogService,
    EventConfirmationAutoApproveCron,
  ],
  exports: [
    EventsService,
    EventsRepository,
    EventDetectionsService,
    EventDetectionsRepository,
    EventConfirmationRepository,
    EventConfirmationService,
    EventAuditLogService,
    EventAuditLogRepository,
    EventValidationService,
  ],
})
export class EventsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply owner resolver for events routes so SharedPermissionGuard can check customer_id
    // Apply to the controller so middleware runs for all sub-routes (eg. /events/:event_id)
    consumer.apply(OwnerResolverMiddleware).forRoutes(EventsController);
  }
}
