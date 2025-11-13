import { Module } from '@nestjs/common';
import { DashboardService } from '../../application/services/dashboard.service';
import { DashboardController } from '../../presentation/controllers/reports/dashboard.controller';
import { ReportsController } from '../../presentation/controllers/reports/reports.controller';
import { AlertsModule } from '../alerts/alerts.module';
import { RepositoriesModule } from '../../infrastructure/repositories/repositories.module';

@Module({
  imports: [AlertsModule, RepositoriesModule],
  controllers: [DashboardController, ReportsController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
