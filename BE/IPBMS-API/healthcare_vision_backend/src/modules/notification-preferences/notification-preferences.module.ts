import { Module } from '@nestjs/common';
import { NotificationPreferencesService } from '../../application/services/notification-preferences.service';
import { NotificationPreferencesRepository } from '../../infrastructure/repositories/notifications/notification-preferences.repository';
import { NotificationPreferencesController } from '../../presentation/controllers/notifications/preferences.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [NotificationPreferencesController],
  providers: [NotificationPreferencesService, NotificationPreferencesRepository],
  exports: [NotificationPreferencesService, NotificationPreferencesRepository],
})
export class NotificationPreferencesModule {}
