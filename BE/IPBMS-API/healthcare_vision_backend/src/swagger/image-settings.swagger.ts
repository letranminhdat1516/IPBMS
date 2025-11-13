import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';

export const ImageSettingsSwagger = {
  list: applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách cấu hình ảnh của user hiện tại' }),
    ApiResponse({
      status: 200,
      schema: {
        example: {
          normal_image_retention_time: 30,
          alert_image_retention_time: 90,
          image_storage_quality: '1080',
        },
      },
    }),
  ),

  get: applyDecorators(
    ApiOperation({ summary: 'Lấy chi tiết 1 cấu hình ảnh theo key' }),
    ApiParam({ name: 'key', example: 'image_quality', description: 'Tên cấu hình ảnh' }),
    ApiResponse({
      status: 200,
      schema: {
        example: {
          key: 'image_quality',
          value: 'Medium (1080p)',
          updated_at: '2025-08-25T14:00:00Z',
        },
      },
    }),
  ),

  set: applyDecorators(
    ApiOperation({ summary: 'Cập nhật cấu hình ảnh theo key' }),
    ApiParam({ name: 'key', example: 'retention_alert_days' }),
    ApiBody({
      required: true,
      schema: {
        type: 'object',
        properties: {
          value: { type: 'string' },
        },
      },
      examples: {
        ImageQuality: {
          summary: 'Chất lượng hình ảnh',
          value: { value: 'Medium (1080p)' },
        },
        IntervalTime: {
          summary: 'Khoảng thời gian chụp',
          value: { value: '30 minute' },
        },
        FrameCount: {
          summary: 'Số khung hình mỗi lần',
          value: { value: '10 frame' },
        },
        RetentionNormal: {
          summary: 'Lưu ảnh thường (ngày)',
          value: { value: '30' },
        },
        RetentionAlert: {
          summary: 'Lưu ảnh cảnh báo (ngày)',
          value: { value: '90' },
        },
      },
    }),
    ApiResponse({
      status: 200,
      schema: {
        example: { success: true },
      },
    }),
  ),

  toggle: applyDecorators(
    ApiOperation({ summary: 'Bật / Tắt cấu hình dạng boolean theo key' }),
    ApiParam({ name: 'key', example: 'capture_enabled' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', example: true },
        },
        required: ['enabled'],
      },
    }),
    ApiResponse({
      status: 200,
      schema: {
        example: { success: true },
      },
    }),
  ),

  batchSave: applyDecorators(
    ApiOperation({ summary: 'Lưu batch tất cả cấu hình ảnh của user' }),
    ApiBody({
      required: true,
      schema: {
        type: 'object',
        properties: {
          settings: {
            type: 'object',
            example: {
              quality: 'high',
              resolution: '1080p',
              auto_upload: true,
              wifi_only: false,
              compression_level: 80,
              max_file_size: '50MB',
            },
          },
        },
        required: ['settings'],
      },
    }),
    ApiResponse({
      status: 200,
      schema: {
        example: {
          success: true,
          data: [
            { key: 'quality', value: 'high' },
            { key: 'resolution', value: '1080p' },
          ],
          message: 'Batch saved 6 image settings',
        },
      },
    }),
  ),
};
