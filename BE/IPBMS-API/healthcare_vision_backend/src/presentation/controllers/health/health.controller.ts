import { Controller, Get, Query, Req, UseGuards, Optional, Logger } from '@nestjs/common';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';
import type { AuthenticatedRequest } from '../../../shared/types/auth.types';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation, ApiResponse } from '@nestjs/swagger';

// Guards & Decorators
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';

// Services
import { HealthAnalyticsService } from '../../../application/services/ai';
import { CacheService } from '../../../application/services/cache.service';
import { PerformanceMonitoringService } from '../../../application/services/performance-monitoring.service';

// DTOs & Types
import { HealthQueryDto } from '../../../application/dto/health-reports/health-query.dto';

// Providers
import { FirebaseAdminService } from '../../../shared/providers/firebase.provider';

// Swagger
import { HealthReportSwagger } from '../../../swagger/health-report.swagger';
import { HealthSwagger } from '../../../swagger/health.swagger';
import { timeUtils } from '../../../shared/constants/time.constants';

// Use shared AuthenticatedRequest and getUserIdFromReq for consistency
type AuthRequest = AuthenticatedRequest & { user?: { userId: string; role?: string } };

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Optional() private readonly _firebase?: FirebaseAdminService,
    @Optional() private readonly _cacheService?: CacheService,
    @Optional() private readonly _performanceMonitoring?: PerformanceMonitoringService,
    @Optional() private readonly _analytics?: HealthAnalyticsService,
  ) {}

  // ===== SYSTEM HEALTH ENDPOINTS =====

  @Get()
  @HealthSwagger.root
  @ApiOperation({
    summary: '🏥 System Health Check',
    description: 'Kiểm tra tình trạng hoạt động của hệ thống',
  })
  @ApiResponse({ status: 200, description: 'Tình trạng hệ thống' })
  root() {
    const now = new Date();
    const base = {
      status: 'ok',
      ts: now.toISOString(),
      ts_local: timeUtils.toTimezoneIsoString(now),
    } as any;
    try {
      // Debug: log the FirebaseAdminService instance and app state
      Logger.debug('🔥 HealthController: _firebase instance:', 'HealthController');
      if (this._firebase) {
        Logger.debug('🔥 HealthController: _firebase.app: available', 'HealthController');
      }
      const app = this._firebase?.getApp();
      base.firebase = app ? { ok: true } : { ok: false, reason: 'not-initialized' };
    } catch (err: any) {
      base.firebase = { ok: false, reason: String(err?.message ?? err) };
    }
    return base;
  }

  @Get('metrics')
  @ApiOperation({
    summary: '📊 System Metrics',
    description: 'Thống kê hiệu năng và cache của hệ thống',
  })
  @ApiResponse({ status: 200, description: 'Metrics hệ thống' })
  metrics() {
    const now2 = new Date();
    return {
      cache: this._cacheService?.getStats() || { status: 'cache-service-not-available' },
      performance: this._performanceMonitoring?.getPerformanceStats() || {
        status: 'performance-service-not-available',
      },
      timestamp: now2.toISOString(),
      timestamp_local: timeUtils.toTimezoneIsoString(now2),
    };
  }

  // ===== HEALTH REPORTS & ANALYTICS ENDPOINTS =====

  @Get('reports/overview')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @ApiQuery({ name: 'userId', required: false })
  @HealthReportSwagger.overview
  @ApiOperation({
    summary: '📋 Health Overview Report',
    description: 'Tổng quan báo cáo sức khỏe của người dùng',
  })
  async getHealthOverview(@Query() query: HealthQueryDto, @Req() req: AuthRequest) {
    if (!this._analytics) {
      return { error: 'Health analytics service not available' };
    }
    const userId = getUserIdFromReq(req);
    return this._analytics.getHealthOverview(query, userId, req.user?.role);
  }

  @Get('reports/insights')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @ApiQuery({ name: 'userId', required: false })
  @HealthReportSwagger.insight
  @ApiOperation({
    summary: '🔍 Health Insights',
    description: 'Phân tích chi tiết và đưa ra insight về sức khỏe',
  })
  async getHealthInsights(@Query() query: HealthQueryDto, @Req() req: AuthRequest) {
    if (!this._analytics) {
      return { error: 'Health analytics service not available' };
    }
    const userId = getUserIdFromReq(req);
    return this._analytics.getHealthInsight(query, userId, req.user?.role);
  }

  @Get('reports/trends')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'period', required: false, description: 'Thời kỳ: daily, weekly, monthly' })
  @ApiOperation({
    summary: '📈 Health Trends',
    description: 'Xu hướng sức khỏe theo thời gian',
  })
  async getHealthTrends(
    @Query() query: HealthQueryDto & { period?: string },
    @Req() req: AuthRequest,
  ) {
    if (!this._analytics) {
      return { error: 'Health analytics service not available' };
    }

    // Extend the analytics service call if needed
    return {
      message: 'Health trends endpoint - implement in HealthAnalyticsService',
      query,
      userId: getUserIdFromReq(req),
      role: req.user?.role,
    };
  }
}
