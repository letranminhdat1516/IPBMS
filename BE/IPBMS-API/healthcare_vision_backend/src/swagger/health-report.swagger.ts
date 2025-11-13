import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

export const HealthReportSwagger = {
  overview: applyDecorators(
    ApiOperation({ summary: 'Tổng quan tình hình cảnh báo sức khỏe trong khoảng thời gian' }),
    ApiQuery({
      name: 'startDay',
      required: false,
      example: '2025-08-18',
      description: 'Ngày bắt đầu phân tích (YYYY-MM-DD)',
    }),
    ApiQuery({
      name: 'endDay',
      required: false,
      example: '2025-08-21',
      description: 'Ngày kết thúc phân tích (YYYY-MM-DD)',
    }),
    ApiResponse({
      status: 200,
      description: 'Kết quả tổng quan sức khỏe người dùng',
      schema: {
        example: {
          abnormal_total: 12,
          resolved_true_rate: 0.83,
          avg_response_seconds: 93,
          open_critical_over_sla: 4,
        },
      },
    }),
  ),

  insight: applyDecorators(
    ApiOperation({ summary: 'Phân tích chuyên sâu các xu hướng và hành vi bất thường' }),
    ApiQuery({
      name: 'startDay',
      required: false,
      example: '2025-08-18',
      description: 'Ngày bắt đầu phân tích (YYYY-MM-DD)',
    }),
    ApiQuery({
      name: 'endDay',
      required: false,
      example: '2025-08-21',
      description: 'Ngày kết thúc phân tích (YYYY-MM-DD)',
    }),
    ApiResponse({
      status: 200,
      description: 'Chi tiết insight theo thời gian, mức độ nghiêm trọng, loại sự kiện',
      schema: {
        example: {
          top_event_type: { type: 'fall', count: 5 },
          high_risk_time: { period: 'Night', count: 7 },
          trend: [
            { date: '2025-08-19', abnormal: 4 },
            { date: '2025-08-20', abnormal: 6 },
          ],
        },
      },
    }),
  ),
};
