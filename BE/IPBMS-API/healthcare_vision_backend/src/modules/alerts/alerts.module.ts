import { Module } from '@nestjs/common';
// NOTE: Only PresentationAlertsController is registered here to avoid dependency injection conflicts.
// The module-local alerts.controller.ts and alerts.service.ts files have been removed.
// Use the presentation layer controller which properly injects the application layer AlertsService.
import { AlertsService } from '../../application/services/alerts.service';
import { RepositoriesModule } from '../../infrastructure/repositories/repositories.module';
import { AlertsController as PresentationAlertsController } from '../../presentation/controllers/notifications/alerts.controller';

@Module({
  imports: [RepositoriesModule],
  controllers: [PresentationAlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
