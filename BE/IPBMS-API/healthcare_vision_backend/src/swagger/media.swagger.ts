import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';

export const MediaSwagger = {
  getSnapshot: applyDecorators(
    ApiOperation({ summary: 'Lấy snapshot dạng hình ảnh' }),
    ApiParam({ name: 'id', description: 'ID snapshot', example: 'snap_abc123' }),
    ApiResponse({
      status: 200,
      description: 'Trả về ảnh PNG (hiện tại là stub)',
      content: {
        'image/png': {
          schema: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    }),
    ApiResponse({ status: 403, description: 'Không có quyền truy cập snapshot này' }),
    ApiResponse({ status: 404, description: 'Snapshot không tồn tại hoặc bị xoá' }),
  ),

  getSnapshotSignedUrl: applyDecorators(
    ApiOperation({ summary: 'Lấy signed URL cho snapshot (tạm thời)' }),
    ApiParam({ name: 'id', description: 'ID snapshot', example: 'snap_abc123' }),
    ApiResponse({
      status: 200,
      description: 'Trả về signed URL tạm thời',
      schema: {
        example: {
          url: 'https://cdn.yourdomain.com/media/snapshots/snap_abc123?token=xyz',
        },
      },
    }),
    ApiResponse({ status: 403, description: 'Không có quyền truy cập snapshot này' }),
  ),

  getSnapshots: applyDecorators(
    ApiOperation({ summary: 'Lấy nhiều snapshots theo danh sách IDs' }),
    ApiQuery({
      name: 'ids',
      description: 'Danh sách IDs cách nhau bằng dấu phẩy',
      example: 'snap_abc123,snap_def456',
    }),
    ApiResponse({
      status: 200,
      description: 'Trả về danh sách snapshots có thể truy cập',
      schema: {
        example: {
          snapshots: [
            {
              id: 'snap_abc123',
              url: 'https://cdn.yourdomain.com/media/snapshots/snap_abc123',
            },
            {
              id: 'snap_def456',
              url: 'https://cdn.yourdomain.com/media/snapshots/snap_def456',
            },
          ],
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Thiếu tham số ids' }),
  ),
};
