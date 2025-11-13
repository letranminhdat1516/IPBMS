// src/modules/activity-logs/activity-logs.module.ts
import { Module } from '@nestjs/common';
import { ActivityLogsService } from '../../application/services/activity-logs.service';
import { ActivityLogsRepository } from '../../infrastructure/repositories/shared/activity-logs.repository';
import { SystemConfigRepository } from '../../infrastructure/repositories/system/system-config.repository';
import { UserPreferencesRepository } from '../../infrastructure/repositories/users/user-preferences.repository';
import { ActivityLogsController } from '../../presentation/controllers/reports/activity-logs.controller';
import { LogAccessGuard } from '../../shared/guards/log-access.guard';
import { SharedPermissionsModule } from '../shared-permissions/shared-permissions.module';

@Module({
  imports: [SharedPermissionsModule],
  controllers: [ActivityLogsController],
  providers: [
    ActivityLogsService,
    ActivityLogsRepository,
    SystemConfigRepository,
    UserPreferencesRepository,
    LogAccessGuard,
  ],
  exports: [ActivityLogsService, LogAccessGuard],
})
export class ActivityLogsModule {}
