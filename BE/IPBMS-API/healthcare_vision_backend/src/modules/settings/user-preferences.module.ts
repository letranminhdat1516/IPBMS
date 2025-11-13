import { Module } from '@nestjs/common';
import { UserPreferencesRepository } from '../../infrastructure/repositories/users/user-preferences.repository';
import { UserPreferencesService } from '../../application/services/users/user-preferences.service';
import { UserPreferencesController } from '../../presentation/controllers/settings/user-preferences.controller';
import { SettingsModule } from '../../modules/settings/settings.module';

@Module({
  imports: [SettingsModule],
  providers: [UserPreferencesRepository, UserPreferencesService],
  controllers: [UserPreferencesController],
  exports: [UserPreferencesService],
})
export class UserPreferencesModule {}
