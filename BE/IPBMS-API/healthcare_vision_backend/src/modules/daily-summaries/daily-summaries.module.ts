import { Module } from '@nestjs/common';
import { DailySummariesRepository } from '../../infrastructure/repositories/reports/daily-summaries.repository';
import { DailySummariesService } from '../../application/services/daily-summaries.service';
import { DailySummariesController } from '../../presentation/controllers/reports/daily-summaries.controller';

@Module({
  imports: [],
  controllers: [DailySummariesController],
  providers: [DailySummariesRepository, DailySummariesService],
  exports: [DailySummariesService],
})
export class DailySummariesModule {}
