import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

export const EventLogsSwagger = {
  list: applyDecorators(
    ApiOperation({
      summary: 'Lấy danh sách event logs (feed) — phân trang & lọc',
      description:
        'Endpoint trả về một danh sách bản ghi event (summary feed) dùng cho dashboard / list view.\n\n' +
        'Phân biệt quan trọng: endpoint này TRẢ VỀ bản ghi dạng feed đã được *sanitize* (loại bỏ các trường nhạy cảm của camera như username, password, ip_address, rtsp_url).\n' +
        'Nếu bạn cần audit history có diffs theo từng trường (per-field diffs) hoặc object detection đầy đủ (bao gồm thông tin camera/rtsp), hãy gọi các endpoint chuyên dụng: `/api/events/:id/history` (audit) hoặc `/api/event-detections` (detection CRUD, có permission).\n\n' +
        'Ghi chú tham số: controller này dùng `page` và `pageSize` (KHÔNG phải `limit`). Sử dụng `pageSize` để điều khiển kích thước trang hiển thị.',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      description: 'Trang (1-based). Mặc định 1',
      example: 1,
    }),
    ApiQuery({
      name: 'pageSize',
      required: false,
      description: 'Số bản ghi mỗi trang (mặc định 50).',
      example: 50,
    }),
    ApiQuery({
      name: 'dateFrom',
      required: false,
      description: 'ISO datetime - lọc detected_at >= dateFrom. Ví dụ: 2025-10-01T00:00:00Z',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      description: 'ISO datetime - lọc detected_at < dateTo. Ví dụ: 2025-10-02T00:00:00Z',
    }),
    ApiQuery({
      name: 'severity',
      required: false,
      description: 'Comma-separated severity values (ví dụ: critical,high,low).',
      example: 'critical,high',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      description: 'Comma-separated status values (ví dụ: detected,resolved,dismissed).',
      example: 'detected',
    }),
    ApiQuery({
      name: 'type',
      required: false,
      description: 'Comma-separated event types (ví dụ: fall,absence,loitering).',
      example: 'fall,absence',
    }),
    ApiQuery({
      name: 'orderBy',
      required: false,
      description: "Trường sắp xếp, ví dụ 'detected_at'",
      example: 'detected_at',
    }),
    ApiQuery({
      name: 'order',
      required: false,
      description: "'ASC' hoặc 'DESC'",
      example: 'DESC',
    }),
    ApiQuery({
      name: 'camera_id',
      required: false,
      description: 'UUID camera cần lọc (ví dụ: 3fa85f64-5717-4562-b3fc-2c963f66afa6)',
    }),
    ApiQuery({
      name: 'timeRange',
      required: false,
      description: 'Friendly time range shortcut (ví dụ: Last 3 Days, Today, Yesterday).',
      example: 'Last 3 Days',
    }),
    ApiQuery({
      name: 'period',
      required: false,
      description: 'Optional period filter like Morning/Afternoon/Evening',
      example: 'Morning',
    }),
    ApiResponse({
      status: 200,
      description: 'Danh sách event log phân trang',
      schema: {
        example: {
          items: [
            {
              event_id: 'uuid',
              camera_id: 'uuid',
              detected_at: '2025-08-22T10:00:00Z',
              status: 'detected',
              type: 'fall',
              severity: 'critical',
              confidence_score: 0.92,
            },
          ],
          total: 12,
          page: 1,
          limit: 50,
        },
      },
    }),
  ),
};
