import { Module } from '@nestjs/common';
import { CacheService } from '../../application/services/cache.service';
import { PerformanceMonitoringService } from '../../application/services/performance-monitoring.service';

@Module({
  providers: [CacheService, PerformanceMonitoringService],
  exports: [CacheService, PerformanceMonitoringService],
})
export class CacheModule {}
