import { SuggestionsService } from '@/application/services';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FcmModule } from '@/modules/fcm/fcm.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { SettingsModule } from '@/modules/settings/settings.module';
import { SuggestionsController } from '@/presentation/controllers/ai/suggestions.controller';
import { Module } from '@nestjs/common';

@Module({
  imports: [SettingsModule, FcmModule, NotificationsModule],
  providers: [PrismaService, SuggestionsService],
  controllers: [SuggestionsController],
  exports: [SuggestionsService],
})
export class SuggestionsModule {}
