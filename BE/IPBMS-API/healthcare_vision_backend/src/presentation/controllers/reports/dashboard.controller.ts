import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from '../../../application/services/dashboard.service';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { DashboardSwagger } from '../../../swagger/dashboard.swagger';

@Controller('dashboard')
@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
export class DashboardController {
  constructor(private readonly _dashboard: DashboardService) {}

  @Get('plan-usage')
  @ApiQuery({ name: 'user_id', required: false, description: 'Filter by user id (UUID)' })
  @DashboardSwagger.planUsage
  async planUsage(@Query('user_id') user_id?: string) {
    return this._dashboard.planUsage(user_id);
  }

  @Get('overview')
  @ApiQuery({ name: 'user_id', required: false, description: 'Filter by user id (UUID)' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (YYYY-MM-DD)' })
  @DashboardSwagger.overview
  async overview(
    @Query('user_id') user_id?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this._dashboard.overview(user_id, from, to);
  }

  @Get('events/stats')
  @DashboardSwagger.eventStats
  async eventStats(
    @Query('start_date') start_date: string,
    @Query('end_date') end_date: string,
    @Query('user_id') user_id?: string,
  ) {
    // Provide default dates if not provided
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
    const defaultEndDate = now;

    const startDate = start_date ? new Date(start_date) : defaultStartDate;
    const endDate = end_date ? new Date(end_date) : defaultEndDate;

    return this._dashboard.getEventStats(startDate, endDate, user_id);
  }

  @Get('events/recent')
  @ApiQuery({ name: 'limit', required: false, description: 'Max number of recent events' })
  async recentEvents(@Query('limit') limit?: string, @Query('user_id') user_id?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this._dashboard.getRecentEvents(limitNum, user_id);
  }

  @Get('users/stats')
  @DashboardSwagger.userStats
  async userStats(@Query('user_id') user_id?: string) {
    return this._dashboard.getUserStats(user_id);
  }

  // Legacy endpoints for backward compatibility
  @Get('alerts/count')
  async alertsCount(@Query('user_id') user_id?: string) {
    return { count: await this._dashboard.getCardAlerts(user_id) };
  }

  @Get('fall-detections/count')
  async fallDetectionsCount(@Query('user_id') user_id?: string) {
    return { count: await this._dashboard.getCardFallDetections(user_id) };
  }

  @Get('cameras/online')
  async camerasOnline(@Query('user_id') user_id?: string) {
    return { count: await this._dashboard.getCardCamerasOnline(user_id) };
  }

  @Get('patients/monitored')
  async monitoredPatients(@Query('user_id') user_id?: string) {
    return { count: await this._dashboard.getCardMonitoredPatients(user_id) };
  }

  @Get('alerts/trend')
  @ApiQuery({ name: 'days', required: false, description: 'Number of days for trend' })
  async alertsTrend(@Query('days') days?: string, @Query('user_id') user_id?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return this._dashboard.getAlertsTrendData(daysNum, user_id);
  }

  @Get('fall-detections/trend')
  @ApiQuery({ name: 'days', required: false, description: 'Number of days for trend' })
  async fallDetectionsTrend(@Query('days') days?: string, @Query('user_id') user_id?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return this._dashboard.getFallDetectionsTrendData(daysNum, user_id);
  }

  @Get('cameras/status')
  @DashboardSwagger.cameraStatus
  async cameraStatus(@Query('user_id') user_id?: string) {
    return this._dashboard.getCameraStatusChart(user_id);
  }

  @Get('cameras/status/overview')
  async cameraStatusOverview(@Query('user_id') user_id?: string) {
    return this._dashboard.getCamerasStatusOverview(user_id);
  }

  @Get('alerts/status/overview')
  async alertsStatusOverview(@Query('user_id') user_id?: string) {
    return this._dashboard.getAlertsStatusOverview(user_id);
  }

  @Get('report-requests/summary')
  async reportRequestsSummary(@Query('user_id') user_id?: string) {
    return this._dashboard.getReportRequestsSummary(user_id);
  }

  @Get('recent-sales')
  @DashboardSwagger.recentSales
  async recentSales(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 5;

    return this._dashboard.getRecentPayments(from, to, pageNum, limitNum);
  }

  @Get('health')
  async healthCheck() {
    return this._dashboard.healthCheck();
  }

  // ========== ADVANCED ANALYTICS ENDPOINTS ==========

  @Get('analytics/user-engagement')
  @DashboardSwagger.userEngagementAnalytics
  async getUserEngagementAnalytics(
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('user_id') userId?: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return this._dashboard.getUserEngagementAnalytics(start, end, userId);
  }

  @Get('analytics/system-performance')
  @DashboardSwagger.systemPerformanceMetrics
  async getSystemPerformanceMetrics(
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return this._dashboard.getSystemPerformanceMetrics(start, end);
  }

  @Get('analytics/predictive')
  @DashboardSwagger.predictiveAnalytics
  async getPredictiveAnalytics(@Query('user_id') userId?: string) {
    return this._dashboard.getPredictiveAnalytics(userId);
  }

  @Get('analytics/advanced-report')
  @DashboardSwagger.advancedReport
  async getAdvancedReport(
    @Query('report_type')
    reportType: 'user-activity' | 'system-performance' | 'revenue-analysis' | 'event-analysis',
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('group_by') groupBy: 'day' | 'week' | 'month' = 'day',
    @Query('user_id') userId?: string,
    @Query('filters') filters?: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const additionalFilters = filters ? JSON.parse(filters) : {};

    return this._dashboard.getAdvancedReport(reportType, {
      startDate: start,
      endDate: end,
      groupBy,
      userId,
      additionalFilters,
    });
  }
}
