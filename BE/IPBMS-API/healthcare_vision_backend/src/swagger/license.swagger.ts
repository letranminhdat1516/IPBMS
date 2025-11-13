import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';

export const LicenseSwagger = {
  activate: applyDecorators(
    ApiOperation({ summary: 'Kích hoạt license cho một site' }),
    ApiBody({
      required: true,
      schema: {
        type: 'object',
        properties: {
          licenseKey: { type: 'string', example: 'ABC-DEF-123' },
          siteId: { type: 'string', example: 'site-xyz-001' },
        },
        required: ['licenseKey', 'siteId'],
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Kích hoạt thành công',
      schema: {
        example: {
          ok: true,
          license_id: 'uuid',
          site_id: 'site-xyz-001',
          used: 2,
          quota: 4,
        },
      },
    }),
  ),

  deactivate: applyDecorators(
    ApiOperation({ summary: 'Hủy kích hoạt license khỏi một site' }),
    ApiBody({
      required: true,
      schema: {
        type: 'object',
        properties: {
          licenseKey: { type: 'string', example: 'ABC-DEF-123' },
          siteId: { type: 'string', example: 'site-xyz-001' },
        },
        required: ['licenseKey', 'siteId'],
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Hủy kích hoạt thành công',
      schema: { example: { ok: true } },
    }),
  ),

  byUser: applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách license theo user' }),
    ApiQuery({
      name: 'user_id',
      required: true,
      example: 'user-123-uuid',
      description: 'ID người dùng sở hữu license',
    }),
    ApiResponse({
      status: 200,
      schema: {
        example: [
          {
            license_id: 'uuid',
            key: 'ABC-DEF-123',
            plan_code: 'solo_plan',
            user_id: 'user-123-uuid',
            created_at: '2025-08-25T14:00:00Z',
          },
        ],
      },
    }),
  ),
};
