// src/modules/snapshots/snapshots.module.ts
import { Module } from '@nestjs/common';
import { SnapshotsRepository } from '../../infrastructure/repositories/media/snapshots.repository';
import { SnapshotsService } from '../../application/services/snapshots.service';
import { SnapshotsController } from '../../presentation/controllers/media/snapshots.controller';
import { MediaController } from '../../presentation/controllers/media/media.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { SnapshotsCleanupCron } from '../../infrastructure/cron/snapshots-cleanup.cron';
import { RepositoriesModule } from '../repositories.module'; // 👈 thêm
import { SettingsModule } from '../settings/settings.module'; // 👈 thêm

@Module({
  imports: [
    CloudinaryModule,
    RepositoriesModule, // 👈 có SnapshotsRepository
    SettingsModule, // 👈 có SystemSettingsService, UserSettingsService
    AccessControlModule,
  ],
  controllers: [SnapshotsController, MediaController],
  providers: [SnapshotsService, SnapshotsCleanupCron, SnapshotsRepository],
  exports: [SnapshotsService],
})
export class SnapshotsModule {}
