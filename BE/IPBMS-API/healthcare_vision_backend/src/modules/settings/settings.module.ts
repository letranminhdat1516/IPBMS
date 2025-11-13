// src/modules/settings/settings.module.ts
import { Module } from '@nestjs/common';
import { StringeeModule } from '../stringee/stringee.module';

// Services & Repos
import { SettingsService } from '../../application/services/system/settings.service';
import { SystemConfigService } from '../../application/services/system/system-config.service';
import { UserPreferencesService } from '../../application/services/users/user-preferences.service';
import { SystemConfigRepository } from '../../infrastructure/repositories/system/system-config.repository';
import { UserPreferencesRepository } from '../../infrastructure/repositories/users/user-preferences.repository';

// Controllers
import { SettingsAdminController } from '../../presentation/controllers/settings/settings-admin.controller';
import { UserPreferencesController } from '../../presentation/controllers/settings/user-preferences.controller';
import { SystemConfigController } from '../../presentation/controllers/system/system-config.controller';
import { SystemController } from '../../presentation/controllers/system/system.controller';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [StringeeModule, ActivityLogsModule],
  controllers: [
    UserPreferencesController,
    SettingsAdminController,
    SystemController,
    SystemConfigController,
  ],
  providers: [
    // SYSTEM
    SystemConfigRepository,
    SettingsService,
    SystemConfigService,

    // USER
    UserPreferencesRepository,
    UserPreferencesService,
  ],
  exports: [
    SettingsService,
    SystemConfigService,
    SystemConfigRepository,
    UserPreferencesService,
    UserPreferencesRepository,
  ],
})
export class SettingsModule {}
