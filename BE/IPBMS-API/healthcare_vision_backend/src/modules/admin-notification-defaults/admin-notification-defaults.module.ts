import { Module } from '@nestjs/common';
import { AdminNotificationDefaultsController } from '../../presentation/controllers/admin/notification-defaults.controller';
import { NotificationPreferencesService } from '../../application/services/notifications/notification-preferences.service';
import { SettingsModule } from '../settings/settings.module';
import { NotificationPreferencesModule } from '../notification-preferences/notification-preferences.module';

@Module({
  imports: [SettingsModule, NotificationPreferencesModule],
  controllers: [AdminNotificationDefaultsController],
  providers: [NotificationPreferencesService],
  exports: [],
})
export class AdminNotificationDefaultsModule {}
