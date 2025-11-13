import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export const HealthSwagger = {
  root: applyDecorators(
    ApiOperation({
      summary: 'Kiểm tra tình trạng hệ thống (Health Check)',
      description: `
Endpoint này dùng để kiểm tra tình trạng hoạt động của API và các dịch vụ tích hợp.

- **status**: Trạng thái chung của API
- **ts**: Thời gian hiện tại (ISO string)
- **firebase**: Trạng thái kết nối Firebase (nếu có cấu hình)
  - \`ok: true\`: Firebase đã khởi tạo thành công
  - \`ok: false\`: Firebase chưa khởi tạo hoặc gặp lỗi
  - \`reason\`: Mô tả lý do nếu không thành công
      `,
    }),
    ApiResponse({
      status: 200,
      description: 'Trả về trạng thái hệ thống',
      schema: {
        example: {
          status: 'ok',
          ts: '2025-09-07T08:50:00.123Z',
          firebase: {
            ok: true,
          },
        },
      },
    }),
  ),
};
