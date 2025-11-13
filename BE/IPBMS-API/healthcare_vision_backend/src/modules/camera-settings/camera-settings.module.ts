import { Module } from '@nestjs/common';
import { CameraSettingsService } from '../../application/services/devices/camera-settings.service';
import { CameraSettingsRepository } from '../../infrastructure/repositories/devices/camera-settings.repository';
import { CameraSettingsController } from '../../presentation/controllers/devices/camera-settings.controller';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [TicketsModule],
  controllers: [CameraSettingsController],
  providers: [CameraSettingsRepository, CameraSettingsService],
  exports: [CameraSettingsService],
})
export class CameraSettingsModule {}
