import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

export const DashboardSwagger = {
  overview: applyDecorators(
    ApiOperation({ summary: 'Tổng quan dashboard' }),
    ApiQuery({ name: 'user_id', required: false, description: 'ID người dùng (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'Thông tin tổng quan dashboard',
      schema: {
        example: {
          success: true,
          data: {
            monitored_patients: 15,
            alerts: { today: 5, week: 32, month: 128 },
            fall_detections: { today: 2, week: 15, month: 67 },
            cameras_online: 8,
            cameras_offline: 2,
            total_cameras: 10,
            system_health: { status: 'healthy', last_check: '2025-09-12T18:00:00.000Z' },
            kpis: {
              total_customers: 1250,
              new_users_in_range: 45,
              new_registrations_this_month: 23,
              patients_under_monitoring: 15,
            },
            recent: {
              customers: [
                {
                  user_id: '42d344e5-b5a7-4e4e-bee6-44f43e75f977',
                  full_name: 'Nguyễn Văn A',
                  email: 'nguyenvana@example.com',
                  phone_number: '+84901234567',
                  created_at: '2025-09-12T10:37:59.636Z',
                },
              ],
            },
          },
          message: 'Operation successful',
          timestamp: '2025-09-12T18:00:00.000Z',
        },
      },
    }),
  ),

  planUsage: applyDecorators(
    ApiOperation({ summary: 'Lấy thông tin sử dụng gói dịch vụ' }),
    ApiQuery({ name: 'user_id', required: false, description: 'ID người dùng (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'Thông tin sử dụng gói dịch vụ',
      schema: {
        example: {
          success: true,
          data: {
            plan_code: 'PREMIUM',
            plan: {
              camera_quota: 20,
              ai_events_quota: 5000,
              caregiver_seats: 10,
              sites: 5,
              retention_days: 90,
              major_updates_months: 24,
              price: 2000000,
            },
            usage: {
              cameras: 12,
              ai_events_this_month: 1250,
              caregiver_seats_active: 6,
              sites_activated: 3,
              snapshots_in_retention: 45000,
            },
            usage_percentages: {
              cameras_percent: 60,
              ai_events_percent: 25,
              caregiver_seats_percent: 60,
              sites_percent: 60,
            },
          },
          message: 'Operation successful',
          timestamp: '2025-09-12T18:00:00.000Z',
        },
      },
    }),
  ),

  reportRequestsSummary: applyDecorators(
    ApiOperation({ summary: 'Tổng quan yêu cầu báo cáo' }),
    ApiQuery({ name: 'from', required: false, description: 'Ngày bắt đầu (YYYY-MM-DD)' }),
    ApiQuery({ name: 'to', required: false, description: 'Ngày kết thúc (YYYY-MM-DD)' }),
    ApiQuery({ name: 'user_id', required: false, description: 'ID người dùng (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'Tổng quan yêu cầu báo cáo',
      schema: {
        example: {
          success: true,
          data: {
            range: { from: '2025-09-06', to: '2025-09-12' },
            reports: {
              total: 22,
              by_status: {
                pending: 8,
                accepted: 11,
                rejected: 2,
              },
              accepted_rate: 50,
            },
            supports: {
              total: 15,
              by_status: {
                pending: 4,
                processing: 6,
                completed: 5,
              },
              processing_rate: 73,
            },
          },
          message: 'Operation successful',
          timestamp: '2025-09-12T18:00:00.000Z',
        },
      },
    }),
  ),

  eventStats: applyDecorators(
    ApiOperation({ summary: 'Thống kê sự kiện' }),
    ApiQuery({ name: 'start_date', required: true, description: 'Ngày bắt đầu (ISO string)' }),
    ApiQuery({ name: 'end_date', required: true, description: 'Ngày kết thúc (ISO string)' }),
    ApiQuery({ name: 'user_id', required: false, description: 'ID người dùng (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'Thống kê sự kiện theo thời gian',
      schema: {
        example: {
          success: true,
          data: {
            hourly_stats: [
              { hour: '00:00', count: 5 },
              { hour: '01:00', count: 3 },
              { hour: '02:00', count: 2 },
            ],
            period: {
              from: '2025-09-06T00:00:00.000Z',
              to: '2025-09-12T23:59:59.999Z',
            },
          },
          message: 'Operation successful',
          timestamp: '2025-09-12T18:00:00.000Z',
        },
      },
    }),
  ),

  cameraStatus: applyDecorators(
    ApiOperation({ summary: 'Tình trạng camera' }),
    ApiResponse({
      status: 200,
      description: 'Thống kê tình trạng camera',
      schema: {
        example: {
          success: true,
          data: { online: 8, offline: 2, total: 10 },
          message: 'Operation successful',
          timestamp: '2025-09-12T18:00:00.000Z',
        },
      },
    }),
  ),

  userStats: applyDecorators(
    ApiOperation({ summary: 'Thống kê người dùng' }),
    ApiQuery({ name: 'user_id', required: false, description: 'ID người dùng (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'Thống kê người dùng',
      schema: {
        example: {
          success: true,
          data: {
            totalUsers: 150,
            activeUsers: 120,
            newUsersThisMonth: 15,
          },
          message: 'Operation successful',
          timestamp: '2025-09-12T18:00:00.000Z',
        },
      },
    }),
  ),

  recentSales: applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách người dùng thanh toán gần đây' }),
    ApiQuery({ name: 'from', required: true, description: 'Ngày bắt đầu (YYYY-MM-DD)' }),
    ApiQuery({ name: 'to', required: true, description: 'Ngày kết thúc (YYYY-MM-DD)' }),
    ApiQuery({ name: 'page', required: false, description: 'Trang hiện tại (mặc định: 1)' }),
    ApiQuery({ name: 'limit', required: false, description: 'Số bản ghi mỗi trang (mặc định: 5)' }),
    ApiResponse({
      status: 200,
      description: 'Danh sách người dùng thanh toán gần đây',
      schema: {
        example: {
          success: true,
          data: [
            {
              payment_id: 'pay-12345678-1234-1234-1234-123456789abc',
              user_id: 'user-12345678-1234-1234-1234-123456789abc',
              user_name: 'Nguyễn Văn A',
              user_email: 'nguyenvana@example.com',
              user_phone: '+84901234567',
              plan_code: 'premium',
              plan_name: 'Gói Premium',
              amount: 5000000,
              currency: 'VND',
              status: 'paid',
              created_at: '2025-09-18T10:30:00.000Z',
              description: 'Thanh toán gói Premium tháng 9/2025',
            },
            {
              payment_id: 'pay-87654321-4321-4321-4321-cba987654321',
              user_id: 'user-87654321-4321-4321-4321-cba987654321',
              user_name: 'Trần Thị B',
              user_email: 'tranthib@example.com',
              user_phone: '+84909876543',
              plan_code: 'basic',
              plan_name: 'Gói Cơ Bản',
              amount: 2000000,
              currency: 'VND',
              status: 'paid',
              created_at: '2025-09-17T15:45:00.000Z',
              description: 'Thanh toán gói Basic tháng 9/2025',
            },
          ],
          pagination: {
            page: 1,
            limit: 5,
            total: 25,
            totalPages: 5,
          },
          message: 'Recent payments retrieved successfully',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Lỗi tham số đầu vào',
      schema: {
        example: {
          statusCode: 400,
          message: 'Invalid date format. Use YYYY-MM-DD format.',
          error: 'Bad Request',
        },
      },
    }),
  ),

  // ========== ADVANCED ANALYTICS SWAGGER ==========

  userEngagementAnalytics: applyDecorators(
    ApiOperation({ summary: 'Phân tích tương tác người dùng' }),
    ApiQuery({ name: 'start_date', required: true, description: 'Ngày bắt đầu (YYYY-MM-DD)' }),
    ApiQuery({ name: 'end_date', required: true, description: 'Ngày kết thúc (YYYY-MM-DD)' }),
    ApiQuery({ name: 'user_id', required: false, description: 'ID người dùng (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'Phân tích tương tác người dùng',
      schema: {
        example: {
          success: true,
          data: {
            loginActivity: {
              totalLogins: 245,
              uniqueUsers: 89,
              averageLoginsPerUser: 2.75,
            },
            searchActivity: {
              totalSearches: 156,
              averageResultsPerSearch: 8.5,
            },
            eventInteractions: {
              totalInteractions: 432,
              interactionTypes: [
                { type: 'fall_detection', count: 45 },
                { type: 'motion', count: 387 },
              ],
              averageInteractionsPerDay: 14.4,
            },
            engagementScore: 78,
          },
        },
      },
    }),
  ),

  systemPerformanceMetrics: applyDecorators(
    ApiOperation({ summary: 'Chỉ số hiệu suất hệ thống' }),
    ApiQuery({ name: 'start_date', required: true, description: 'Ngày bắt đầu (YYYY-MM-DD)' }),
    ApiQuery({ name: 'end_date', required: true, description: 'Ngày kết thúc (YYYY-MM-DD)' }),
    ApiResponse({
      status: 200,
      description: 'Chỉ số hiệu suất hệ thống',
      schema: {
        example: {
          success: true,
          data: {
            apiResponseTimes: {
              averageResponseTime: 150,
              p95ResponseTime: 300,
              slowestEndpoints: [{ endpoint: '/api/events', avgTime: 250 }],
            },
            errorRates: {
              totalErrors: 15,
              errorRate: 0.02,
              errorTypes: { '4xx': 10, '5xx': 5 },
            },
            databasePerformance: {
              averageQueryTime: 25,
              slowQueries: 3,
              cacheHitRate: 0.85,
            },
            overallHealthScore: 87,
          },
        },
      },
    }),
  ),

  predictiveAnalytics: applyDecorators(
    ApiOperation({ summary: 'Phân tích dự đoán' }),
    ApiQuery({ name: 'user_id', required: false, description: 'ID người dùng (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'Phân tích dự đoán',
      schema: {
        example: {
          success: true,
          data: {
            churnRisk: {
              riskLevel: 'low',
              riskScore: 15,
              factors: ['Regular login activity'],
            },
            usageForecast: {
              predictedGrowth: 0.15,
              confidence: 0.85,
            },
            revenueForecast: {
              predictedRevenue: 2500,
              growthRate: 0.08,
            },
            recommendations: ['Consider offering retention incentives'],
          },
        },
      },
    }),
  ),

  advancedReport: applyDecorators(
    ApiOperation({ summary: 'Báo cáo nâng cao với tùy chỉnh' }),
    ApiQuery({
      name: 'report_type',
      required: true,
      enum: ['user-activity', 'system-performance', 'revenue-analysis', 'event-analysis'],
    }),
    ApiQuery({ name: 'start_date', required: true, description: 'Ngày bắt đầu (YYYY-MM-DD)' }),
    ApiQuery({ name: 'end_date', required: true, description: 'Ngày kết thúc (YYYY-MM-DD)' }),
    ApiQuery({
      name: 'group_by',
      required: false,
      enum: ['day', 'week', 'month'],
      description: 'Nhóm theo thời gian',
    }),
    ApiQuery({ name: 'user_id', required: false, description: 'ID người dùng (admin only)' }),
    ApiQuery({ name: 'filters', required: false, description: 'Bộ lọc bổ sung (JSON)' }),
    ApiResponse({
      status: 200,
      description: 'Báo cáo nâng cao',
      schema: {
        example: {
          success: true,
          data: {
            reportType: 'user-activity',
            generatedAt: '2025-10-04T10:00:00.000Z',
            filters: { startDate: '2025-09-01', endDate: '2025-09-30' },
            data: {
              totalActiveUsers: 1250,
              newUserRegistrations: 45,
              userRetentionRate: 0.85,
            },
          },
        },
      },
    }),
  ),
};
