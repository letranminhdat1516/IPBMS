import { Module } from '@nestjs/common';
import { ImageSettingsService } from '../../application/services/image-settings.service';
import { ImageSettingsRepository } from '../../infrastructure/repositories/media/image-settings.repository';
import { ImageSettingsController } from '../../presentation/controllers/settings/images.controller';

@Module({
  imports: [],
  controllers: [ImageSettingsController],
  providers: [ImageSettingsService, ImageSettingsRepository],
  exports: [ImageSettingsService],
})
export class ImageSettingsModule {}
