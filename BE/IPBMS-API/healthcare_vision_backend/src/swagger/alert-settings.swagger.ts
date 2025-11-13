import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiParam, ApiBody } from '@nestjs/swagger';

export const AlertSettingsSwagger = {
  list: applyDecorators(
    ApiOperation({ summary: 'Lấy toàn bộ cài đặt cảnh báo của user hiện tại' }),
    ApiOkResponse({ description: 'Danh sách key-value cấu hình cảnh báo' }),
  ),

  get: applyDecorators(
    ApiOperation({ summary: 'Lấy cấu hình cảnh báo theo key' }),
    ApiParam({ name: 'key', description: 'Tên khóa cài đặt', example: 'threshold' }),
    ApiOkResponse({ description: 'Thông tin key cảnh báo trả về thành công' }),
  ),

  set: applyDecorators(
    ApiOperation({ summary: 'Cập nhật giá trị cho key cảnh báo' }),
    ApiParam({ name: 'key', description: 'Tên khóa cảnh báo', example: 'threshold' }),
    ApiBody({
      required: true,
      schema: {
        type: 'object',
        properties: {
          value: { type: 'string' },
        },
      },
      examples: {
        Threshold: {
          summary: 'Ngưỡng phát hiện',
          value: { value: '0.85' },
        },
        DefaultLevel: {
          summary: 'Cấp cảnh báo mặc định',
          value: { value: '2' },
        },
        EmailSubjectPrefix: {
          summary: 'Tiền tố tiêu đề email',
          value: { value: '[Care Alert]' },
        },
      },
    }),
    ApiOkResponse({ description: 'Cập nhật thành công' }),
  ),

  toggle: applyDecorators(
    ApiOperation({ summary: 'Bật/tắt một loại cảnh báo cụ thể' }),
    ApiParam({ name: 'key', description: 'Tên khóa cảnh báo cần bật/tắt', example: 'threshold' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', example: true },
        },
        required: ['enabled'],
      },
    }),
    ApiOkResponse({ description: 'Trạng thái cảnh báo đã được cập nhật' }),
  ),
};
