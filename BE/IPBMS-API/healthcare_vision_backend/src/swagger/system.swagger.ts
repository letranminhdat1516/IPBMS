import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import {
  EmergencyProtocolDto,
  SettingUpdateResponseDto,
} from '../application/dto/system/system-config.dto';
import { NotificationTestDto } from '../application/dto/system/notification-test.dto';
import { SetSettingValueDto } from '../application/dto/system/set-setting-value.dto';

export const SystemSwagger = {
  notificationTest: applyDecorators(
    ApiOperation({
      summary: 'Gửi thử thông báo (push / sms / call)',
      description:
        'Gửi payload thử cho hệ thống thông báo. Lưu ý: với FCM (push) để hiển thị notification hệ thống khi app ở background/terminated, payload phải chứa cả `notification` và `data`. Nếu chỉ gửi `data`, thông báo chỉ được xử lý khi app ở foreground.',
    }),
    ApiBody({
      description: 'Payload ví dụ cho gửi thử thông báo. (push: notification + data)',
      type: NotificationTestDto,
      examples: {
        push: {
          summary: 'Ví dụ payload cho push (FCM)',
          value: {
            notification: {
              title: 'Cảnh báo y tế',
              body: 'Phát hiện ngã trong phòng khách',
              sound: 'default',
            },
            data: { event_id: 'evt_1', event_type: 'fall', urgent: 'true', status: 'danger' },
          },
        },
        sms: {
          summary: 'Ví dụ payload cho SMS',
          value: { channel: 'sms', to: '0987654321', payload: { text: 'Có sự cố xảy ra!' } },
        },
      },
    }),
    ApiResponse({ status: 200, description: 'Gửi thông báo thành công' }),
  ),

  getSettings: applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách setting theo key' }),
    ApiQuery({
      name: 'keys',
      required: true,
      example: 'camera,image_config,notification_channels,ai_frequency,log_config',
    }),
    ApiResponse({ status: 200 }),
  ),

  getSettingKey: applyDecorators(
    ApiOperation({ summary: 'Lấy giá trị setting theo key cụ thể' }),
    ApiParam({ name: 'key', example: 'camera' }),
    ApiResponse({ status: 200 }),
  ),

  getSystemInfo: applyDecorators(
    ApiOperation({ summary: 'Lấy thông tin hệ thống' }),
    ApiResponse({
      status: 200,
      description: 'Thông tin chi tiết về hệ thống',
      schema: {
        example: {
          system: {
            platform: 'darwin',
            arch: 'x64',
            hostname: 'localhost',
            uptime: 123456,
            loadavg: [1.5, 1.2, 1.0],
            totalmem: 17179869184,
            freemem: 8589934592,
            cpus: 8,
          },
          process: {
            pid: 12345,
            uptime: 1234,
            memory: {
              rss: 104857600,
              heapTotal: 67108864,
              heapUsed: 45000000,
              external: 2000000,
            },
            version: 'v18.17.0',
          },
          environment: {
            node_env: 'development',
            port: '3010',
            database_url: 'configured',
            jwt_secret: 'configured',
          },
          timestamp: '2025-09-15T05:30:00.000Z',
        },
      },
    }),
  ),

  putSetting: applyDecorators(
    ApiOperation({ summary: 'Cập nhật setting theo key' }),
    ApiParam({ name: 'key', example: 'camera' }),
    ApiQuery({ name: 'dryRun', required: false, example: '1' }),
    ApiBody({
      description: 'Giá trị mới cho setting tương ứng',
      type: SetSettingValueDto,
      examples: {
        default: {
          summary: 'Ví dụ giá trị setting',
          value: {
            value: { enable: true, count: 30, quality_percent: 80, quality: 'high' },
          },
        },
      },
    }),
    ApiResponse({ status: 200, type: SettingUpdateResponseDto }),
  ),

  emergencyProtocols: {
    get: applyDecorators(
      ApiOperation({ summary: 'Lấy danh sách Emergency Protocols' }),
      ApiResponse({ status: 200, type: [EmergencyProtocolDto] }),
    ),

    upsert: applyDecorators(
      ApiOperation({ summary: 'Cập nhật danh sách Emergency Protocols' }),
      ApiBody({
        description: 'Danh sách protocol cần cập nhật',
        type: [EmergencyProtocolDto],
        examples: {
          default: {
            summary: 'Ví dụ',
            value: [
              {
                name: 'Rơi',
                steps: [
                  JSON.stringify({
                    type: 'detect',
                    title: 'Phát hiện rơi',
                    desc: 'AI phát hiện người bị ngã',
                  }),
                  JSON.stringify({
                    type: 'notify',
                    title: 'Gửi cảnh báo',
                    desc: 'Thông báo cho người chăm sóc',
                  }),
                ],
              },
            ],
          },
        },
      }),
      ApiResponse({ status: 200, type: [EmergencyProtocolDto] }),
    ),
  },
  usageHistory: applyDecorators(
    ApiOperation({ summary: 'Lấy usage history (timeline)' }),
    ApiQuery({ name: 'from', required: false, description: 'Ngày (ISO) bắt đầu (bao gồm)' }),
    ApiQuery({ name: 'to', required: false, description: 'Ngày (ISO) kết thúc (bao gồm)' }),
    ApiQuery({ name: 'limit', required: false, description: 'Số mục tối đa trả về' }),
    ApiOperation({
      summary: 'Lấy usage history (timeline)',
    }),

    ApiResponse({
      status: 200,
      description:
        'Lịch sử sử dụng / timeline telemetry (danh sách tóm tắt). Lưu ý: Endpoint này trả về các mục timeline — không phải audit history theo từng trường với `changes[]` / `change_count`.\nSử dụng các endpoint lịch sử chuyên biệt để lấy khác biệt theo trường khi có.',
    }),
  ),
  getForwardingMode: applyDecorators(
    ApiOperation({ summary: 'Lấy chế độ forward event tự động (attempts | timeout)' }),
    ApiResponse({
      status: 200,
      description: 'Current forwarding mode',
      schema: { example: { mode: 'timeout' } },
    }),
  ),

  setForwardingMode: applyDecorators(
    ApiOperation({ summary: 'Thiết lập chế độ forward event tự động (attempts | timeout)' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: { mode: { type: 'string', enum: ['attempts', 'timeout'] } },
        required: ['mode'],
        example: { mode: 'attempts' },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Mode updated',
      schema: { example: { mode: 'attempts' } },
    }),
  ),

  getForwardingThresholds: applyDecorators(
    ApiOperation({ summary: 'Lấy cấu hình thresholds cho cơ chế timeout (seconds)' }),
    ApiResponse({
      status: 200,
      description: 'Mapping event_type -> seconds or a single number default',
      schema: { example: { emergency: 30, fall: 45, default: 30 } },
    }),
  ),

  setForwardingThresholds: applyDecorators(
    ApiOperation({
      summary:
        'Cập nhật thresholds cho cơ chế timeout. Giá trị là JSON mapping hoặc single number.',
    }),
    ApiBody({
      schema: {
        oneOf: [
          { type: 'number', example: 30 },
          {
            type: 'object',
            example: { emergency: 30, fall: 45, abnormal_behavior: 40 },
          },
        ],
      },
    }),
    ApiResponse({ status: 200, description: 'Thresholds updated' }),
  ),
};
