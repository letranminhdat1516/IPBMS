import { Module } from '@nestjs/common';
import { AlertSettingsService } from '../../application/services/notifications/alert-settings.service';
import { AlertSettingsRepository } from '../../infrastructure/repositories/notifications/alert-settings.repository';
import { AlertSettingsController } from '../../presentation/controllers/settings/alerts.controller';
import { SharedModule } from '../shared-otp/shared-otp.module';

@Module({
  imports: [SharedModule],
  controllers: [AlertSettingsController],
  providers: [AlertSettingsRepository, AlertSettingsService],
  exports: [AlertSettingsService],
})
export class AlertSettingsModule {}
