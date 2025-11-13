import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { SleepCheckinDto } from '../application/dto/patient-info/sleep-checkin.dto';
import { AdminResponseDto } from '../application/dto/user-detail/admin.dto';
import { AlertsResponseDto } from '../application/dto/user-detail/alerts.dto';
import { MonitoringResponseDto } from '../application/dto/user-detail/monitoring.dto';
import { OverviewResponseDto } from '../application/dto/user-detail/overview.dto';
import { ServicesResponseDto } from '../application/dto/user-detail/services.dto';

export const UserDetailsSwagger = {
  overview: applyDecorators(
    ApiOperation({ summary: 'Tổng quan health status của user/patient' }),
    ApiQuery({ name: 'range', required: false, enum: ['today', '7d', '30d'] }),
    ApiOkResponse({ type: OverviewResponseDto }),
  ),

  alerts: applyDecorators(
    ApiOperation({ summary: 'Danh sách cảnh báo (alerts) của user' }),
    ApiOkResponse({ type: AlertsResponseDto }),
  ),

  monitoring: applyDecorators(
    ApiOperation({ summary: 'Dữ liệu monitoring timeline + 24h analytics' }),
    ApiQuery({ name: 'date', required: false, description: 'Định dạng YYYY-MM-DD (UTC)' }),
    ApiQuery({ name: 'include', required: false, isArray: true, type: String }),
    ApiOkResponse({ type: MonitoringResponseDto }),
  ),

  patchMonitoring: applyDecorators(
    ApiOperation({ summary: 'Cập nhật settings của monitoring cho user' }),
    ApiOkResponse({ type: MonitoringResponseDto }),
  ),

  services: applyDecorators(
    ApiOperation({ summary: 'Dịch vụ đang kích hoạt cho user' }),
    ApiQuery({ name: 'include', required: false, isArray: true, type: String }),
    ApiOkResponse({ type: ServicesResponseDto }),
  ),

  admin: applyDecorators(
    ApiOperation({ summary: 'Thông tin chi tiết admin của user' }),
    ApiOkResponse({ type: AdminResponseDto }),
  ),

  sleepCheckin: applyDecorators(
    ApiOperation({ summary: 'Điểm danh giấc ngủ cho bệnh nhân' }),
    ApiParam({
      name: 'id',
      description: 'User ID (UUID v4)',
      schema: { type: 'string', format: 'uuid' },
    }),
    ApiBody({
      type: SleepCheckinDto,
      examples: {
        sleep_now: {
          summary: 'Điểm danh bắt đầu ngủ',
          value: { state: 'sleep', timestamp: '2025-11-07T23:00:00Z', source: 'app' },
        },
        awake_now: {
          summary: 'Điểm danh tỉnh dậy',
          value: { state: 'awake', timestamp: '2025-11-08T07:05:00Z', source: 'app' },
        },
      },
    }),
    ApiCreatedResponse({
      description:
        'Điểm danh đã được ghi nhận. Trả về activity log id và thông tin checkin nếu đã lưu được.',
      schema: {
        example: {
          ok: true,
          log_id: 'b2b1f6d2-3a5a-4c2b-a1e2-1234567890ab',
          persisted: true,
          checkin: {
            id: 'c3c2f7e3-4b6b-5d3c-b2f3-0987654321fe',
            user_id: 'user-uuid',
            date: '2025-11-07',
            state: 'sleep',
            meta: {
              source: 'app',
              activity_log_id: 'b2b1f6d2-3a5a-4c2b-a1e2-1234567890ab',
            },
            created_at: '2025-11-07T23:00:05Z',
            updated_at: '2025-11-07T23:00:05Z',
          },
        },
      },
    }),
    // Helpful error examples
    ApiBadRequestResponse({
      description: 'Lỗi: dữ liệu không hợp lệ',
      schema: { example: { statusCode: 400, message: 'Invalid body: state is required' } },
    }),
    ApiUnauthorizedResponse({
      description: 'Chưa đăng nhập / token không hợp lệ',
      schema: { example: { statusCode: 401, message: 'Unauthorized' } },
    }),
    ApiForbiddenResponse({
      description: 'Không có quyền truy cập',
      schema: { example: { statusCode: 403, message: 'Forbidden' } },
    }),
  ),

  sleepCheckinHistory: applyDecorators(
    ApiOperation({ summary: 'Lấy lịch sử điểm danh giấc ngủ' }),
    ApiParam({
      name: 'id',
      description: "UUID của bệnh nhân (user_id trong bảng 'users', role = customer)",
      schema: { type: 'string', format: 'uuid' },
      example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    }),
    ApiQuery({
      name: 'from',
      required: false,
      description: 'Từ ngày (ISO 8601), ví dụ 2025-11-01',
    }),
    ApiQuery({
      name: 'to',
      required: false,
      description: 'Đến ngày (ISO 8601), inclusive',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      description: 'Trang (1-based)',
      example: 1,
      type: Number,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Số bản ghi trên trang',
      example: 20,
      type: Number,
    }),
    ApiQuery({
      name: 'sortBy',
      required: false,
      enum: ['date', 'created_at', 'updated_at', 'state'],
    }),
    ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] }),
    ApiQuery({
      name: 'state',
      required: false,
      description: 'Lọc theo trạng thái (sleep|awake)',
    }),
    ApiQuery({
      name: 'source',
      required: false,
      description: 'Lọc theo meta.source (ví dụ: app, device)',
    }),
    ApiOkResponse({
      description: 'Danh sách checkins theo ngày (paged)',
      schema: {
        example: {
          page: 1,
          limit: 20,
          total: 123,
          items: [
            {
              id: 'c3c2f7e3-4b6b-5d3c-b2f3-0987654321fe',
              user_id: 'user-uuid',
              date: '2025-11-07',
              state: 'sleep',
              meta: { source: 'app', activity_log_id: 'b2b1f6d2-3a5a-4c2b-a1e2-1234567890ab' },
              created_at: '2025-11-07T23:00:05Z',
              updated_at: '2025-11-07T23:00:05Z',
            },
          ],
        },
      },
    }),
  ),
};
