// src/modules/health-report/health-report.module.ts
import { Module } from '@nestjs/common';
import { HealthController } from '../../presentation/controllers/health/health.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { HealthAnalyticsService } from '../../application/services/health-analytics.service';
import { EventsRepository } from '../../infrastructure/repositories/events/events.repository';

@Module({
  imports: [FirebaseModule],
  controllers: [HealthController],
  providers: [HealthAnalyticsService, EventsRepository],
  exports: [HealthAnalyticsService],
})
export class HealthReportModule {}
