import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';

export const EventDetectionsSwagger = {
  patientHabits: applyDecorators(
    ApiOperation({
      summary: 'Lấy events và patient habits cho từng user (feed theo ngày)',
      description:
        'Lấy các events trong khoảng từ 12:00 ngày trước tới 12:00 ngày kết thúc và thông tin patient_habits tương ứng cho các user (mỗi user chỉ trả một record habit). Dùng cho báo cáo thói quen bệnh nhân hoặc phân tích hành vi.',
    }),
    ApiQuery({
      name: 'to',
      required: false,
      description:
        'Ngày kết thúc cho khoảng lấy dữ liệu. Hỗ trợ định dạng YYYY-MM-DD hoặc ISO 8601 (ví dụ: 2025-10-21 hoặc 2025-10-21T12:00:00Z). Endpoint sẽ sử dụng mốc 12:00 (noon) của ngày nếu chỉ truyền ngày. Mặc định = hôm nay (server timezone UTC).',
      example: '2025-10-21',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description:
        'Số bản ghi tối đa trả về (integer). Mặc định = 1000. Server có thể clamp theo MAX_PAGE_SIZE.',
      example: 1000,
    }),
    ApiQuery({
      name: 'page',
      required: false,
      description: 'Số trang (1-based). Mặc định = 1. Kết hợp với `limit` để phân trang.',
      example: 1,
    }),
    ApiQuery({
      name: 'eventFields',
      required: false,
      description:
        'Comma-separated list của các trường event muốn trả về (ví dụ: event_id,detected_at,confidence_score). Nếu không truyền => server trả mặc định tập trường cần thiết.',
      example: 'event_id,detected_at,confidence_score',
    }),
    ApiQuery({
      name: 'habitFields',
      required: false,
      description:
        'Comma-separated list của các trường patient_habits cần select. Ví dụ: last_meal,bed_time',
      example: 'last_meal,bed_time',
    }),
    ApiQuery({
      name: 'saveToFile',
      required: false,
      description:
        'Nếu = true thì server sẽ export kết quả ra file trên disk (data/) và trả về payload cùng đường dẫn file. Tham số này thường dùng cho export/ETL.',
      example: false,
    }),
    ApiQuery({
      name: 'filename',
      required: false,
      description:
        'Tên file output khi saveToFile=true. Nếu không truyền, server sẽ sinh tên tự động (timestamp).',
      example: 'events_2025-10-21.json',
    }),
    ApiQuery({
      name: 'mock',
      required: false,
      description:
        'Nếu = true trả dữ liệu mẫu (mock) dùng cho phát triển và kiểm thử; không truy vấn DB thật.',
      example: false,
    }),
    ApiResponse({
      status: 200,
      description: 'Trả về object chứa event-detections và patient-habits kèm meta',
    }),
  ),

  list: applyDecorators(
    ApiOperation({
      summary: 'Lấy danh sách event-detections',
      description:
        'Lấy danh sách event detections hỗ trợ phân trang và lọc theo camera, thời gian, trạng thái, loại, mức độ và sắp xếp. Thích hợp cho trang quản trị/hiển thị danh sách.',
    }),
    ApiQuery({
      name: 'camera_id',
      required: false,
      description: 'Filter theo camera_id (uuid)',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      description: 'Trang (mặc định 1)',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Số bản ghi trên 1 trang (mặc định 50)',
    }),
    ApiQuery({
      name: 'dateFrom',
      required: false,
      description: 'Ngày/ISO bắt đầu (inclusive)',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      description: 'Ngày/ISO kết thúc (inclusive)',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      description: 'Lọc theo status (comma-separated)',
    }),
    ApiQuery({
      name: 'type',
      required: false,
      description: 'Lọc theo event type (comma-separated)',
    }),
    ApiQuery({
      name: 'severity',
      required: false,
      description: 'Lọc theo severity (comma-separated)',
    }),
    ApiQuery({
      name: 'orderBy',
      required: false,
      description: "Trường sắp xếp: 'detected_at' | 'confidence_score'",
    }),
    ApiQuery({
      name: 'order',
      required: false,
      description: "'ASC' hoặc 'DESC'",
    }),
    ApiResponse({
      status: 200,
      description: 'Trả về object paginated với items, total, page, limit',
    }),
  ),

  create: applyDecorators(
    ApiOperation({
      summary: 'Tạo một event detection mới',
      description:
        'Tạo bản ghi event detection. Trường `user_id` sẽ được ghi từ token hiện tại nếu không được cung cấp.',
    }),
    ApiBody({
      schema: {
        description:
          'Request body để tạo Event Detection. Các trường:\n' +
          '- user_id (string, optional): UUID của user; nếu không gửi sẽ lấy từ token.\n' +
          '- snapshot_id (string, optional): UUID của snapshot liên quan (nếu có).\n' +
          '- camera_id (string, required): UUID camera nơi phát hiện.\n' +
          '- event_type (string, required): Loại sự kiện (ví dụ: fall, convulsion).\n' +
          '- event_description (string, optional): Mô tả ngắn hiển thị cho người dùng.\n' +
          '- detection_data (object, optional): Dữ liệu thô từ model/edge (boxes, scores, modelVersion).\n' +
          '- ai_analysis_result (object, optional): Kết quả phân tích đã chuẩn hoá (label, confidence).\n' +
          '- confidence_score (number, optional): 0.0-1.0; điểm tin cậy.\n' +
          '- detected_at (string, optional): ISO datetime; nếu không gửi server gán thời gian hiện tại.\n' +
          '- notes (string, optional): Ghi chú từ caregiver; server sẽ sanitize.\n',
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            nullable: true,
            description:
              'UUID của user (optional). Nếu không gửi trường này, server sẽ lấy `user_id` từ token và gán tự động. Chỉ admin mới có thể ghi user_id khác.',
            example: 'user_abc_uuid',
          },
          snapshot_id: {
            type: 'string',
            nullable: true,
            description:
              'UUID của snapshot (nếu có). Thường lấy từ bảng media/snapshots; giúp liên kết ảnh với bản ghi event để debug và xem lại. Nên là UUID dạng v4.',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
          camera_id: {
            type: 'string',
            description:
              'UUID của camera nơi phát hiện. Bắt buộc nếu không truyền `user_id`. Giá trị phải là camera hợp lệ thuộc về user/caregiver tương ứng. FE nên gửi UUID đầy đủ.',
            example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          },
          event_type: {
            type: 'string',
            description:
              'Loại sự kiện. Giá trị hợp lệ (chữ thường): `fall`, `convulsion`, `stagger`, `visitor`, `unknown`. FE nên validate trước khi gửi; backend có thể ánh xạ/chuẩn hoá giá trị.',
            example: 'fall',
          },
          event_description: {
            type: 'string',
            nullable: true,
            description:
              'Mô tả ngắn, thân thiện cho con người (max ~500 ký tự). Dùng để hiển thị trên UI và notification; nên tránh thông tin nhạy cảm.',
            maxLength: 500,
            example: 'Ngã cạnh giường lúc đang đứng dậy',
          },
          detection_data: {
            type: 'object',
            nullable: true,
            description:
              'Dữ liệu thô trả về từ model/edge device (JSON). Ví dụ: { boxes: [{ x,y,w,h }], scores: [0.9], modelVersion: "v1.2", deviceId: "edge-01" }. KHÔNG chèn thông tin nhạy cảm (PII) như faces/identifiers.',
            example: {
              boxes: [{ x: 10, y: 20, w: 100, h: 120 }],
              scores: [0.95],
              modelVersion: 'v1.2',
            },
          },
          ai_analysis_result: {
            type: 'object',
            nullable: true,
            description:
              'Kết quả phân tích chuẩn hóa (optional). Ví dụ: { label: "fall", confidence: 0.95, meta: { posture: "lying" } }. FE/BE có thể dùng trường này để hiển thị label/score.',
            example: { label: 'fall', confidence: 0.95 },
          },
          confidence_score: {
            type: 'number',
            nullable: true,
            description:
              'Điểm tin cậy số thực trong khoảng 0.0 - 1.0; server/AI có thể dùng ngưỡng để quyết định mức ưu tiên. Nếu cả `ai_analysis_result.confidence` và `confidence_score` được gửi, backend có thể ưu tiên `ai_analysis_result`.',
            minimum: 0,
            maximum: 1,
            example: 0.95,
          },
          detected_at: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description:
              'Thời gian sự kiện được phát hiện (ISO 8601). Nên gửi ở UTC (ví dụ: 2025-10-04T06:15:00Z). Nếu không cung cấp, server sẽ gán thời gian hiện tại.',
            example: '2025-10-04T06:15:00.000Z',
          },
          notes: {
            type: 'string',
            nullable: true,
            description:
              'Ghi chú tự do (max ~1000 ký tự). Dùng cho chú thích/feedback từ caregiver hoặc hệ thống. Server sẽ sanitize HTML/JS để tránh XSS; nên gửi plain text.',
            maxLength: 1000,
            example: 'Người bệnh trượt chân khi đứng dậy',
          },
        },
        required: ['event_type', 'camera_id'],
        example: {
          snapshot_id: 'snap_123',
          camera_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          event_type: 'fall',
          event_description: 'Detected fall near bed',
          confidence_score: 0.95,
          detected_at: '2025-10-04T06:15:00.000Z',
        },
      },
    }),
    ApiResponse({ status: 201, description: 'Event được tạo thành công' }),
  ),

  update: applyDecorators(
    ApiOperation({
      summary: 'Cập nhật event detection',
      description:
        'Cập nhật các trường an toàn của event như status, acknowledged, dismissed, notes.',
    }),
    ApiParam({ name: 'event_id', description: 'Event UUID', format: 'uuid' }),
    ApiBody({
      schema: {
        description:
          'Request body để cập nhật event detection. Các trường đều optional và chỉ những trường được gửi sẽ được cập nhật:\n' +
          '- status (string): trạng thái mới (new, detected, reviewed, resolved, dismissed).\n' +
          '- verified_by, verified_at (UUID / datetime): thông tin verify (thường server gán từ token).\n' +
          '- acknowledged_by, acknowledged_at (UUID / datetime): thông tin acknowledge.\n' +
          '- dismissed_at (datetime): thời điểm dismissed.\n' +
          '- notes (string): ghi chú cập nhật; server sanitize.\n',
        type: 'object',
        properties: {
          status: {
            type: 'string',
            nullable: true,
            description:
              'Trạng thái của event. Các giá trị phổ biến: `new`, `detected`, `reviewed`, `resolved`, `dismissed`. FE/BE nên thống nhất danh sách và validate trước khi gửi. Thay đổi status có thể trigger workflow/notification.',
            example: 'reviewed',
          },
          verified_by: {
            type: 'string',
            nullable: true,
            description:
              'UUID của actor đã thực hiện verify. Thường server sẽ ghi từ token; chỉ gửi khi backend cho phép impersonation (admin).',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
          verified_at: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description:
              'Thời điểm xác minh (ISO 8601). Nếu không gửi, server có thể set thời điểm hiện tại khi thực hiện verify.',
            example: '2025-10-04T07:00:00.000Z',
          },
          acknowledged_by: {
            type: 'string',
            nullable: true,
            description:
              'UUID của actor đã acknowledge (nhận biết) sự kiện; server thường gán từ token khi user thực hiện action.',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
          acknowledged_at: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description:
              'Thời điểm acknowledge được thực hiện (ISO 8601). Server có thể gán nếu action do user thực hiện.',
            example: '2025-10-04T07:10:00.000Z',
          },
          dismissed_at: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description:
              'Thời điểm sự kiện được đánh dấu dismissed/ignored. Dùng khi quyết định rằng event không cần hành động tiếp theo.',
            example: '2025-10-04T08:00:00.000Z',
          },
          notes: {
            type: 'string',
            nullable: true,
            description:
              'Ghi chú cập nhật (ví dụ: lý do đổi trạng thái). Server sẽ sanitize input và có thể trim quá dài.',
            maxLength: 1000,
            example: 'Checked and reviewed by staff, no further action required',
          },
        },
        example: { status: 'reviewed', notes: 'Checked and reviewed by staff' },
      },
    }),
    ApiResponse({ status: 200, description: 'Event được cập nhật' }),
  ),

  remove: applyDecorators(
    ApiOperation({
      summary: 'Xóa event detection',
      description: 'Xóa một event detection theo event_id',
    }),
    ApiParam({ name: 'event_id', description: 'Event UUID', format: 'uuid' }),
    ApiResponse({ status: 200, description: 'Event đã được xóa' }),
  ),

  confirmStatus: applyDecorators(
    ApiOperation({
      summary: 'Cập nhật trạng thái xác nhận của event (confirm/reject)',
      description:
        'Cập nhật confirm_status cho event detection. Nếu confirm_status=true sẽ thiết lập acknowledged_at và acknowledged_by; nếu false thì ghi notes và không set acknowledged.',
    }),
    ApiParam({ name: 'event_id', description: 'Event UUID', format: 'uuid' }),
    ApiBody({
      schema: {
        description:
          'Request body cho hành động xác nhận (confirm) của event:\n' +
          '- confirm_status (boolean, required): true = xác nhận/approve; false = reject.\n' +
          '- notes (string, optional): lý do/ghi chú kèm hành động; server sẽ sanitize.\n',
        type: 'object',
        properties: {
          confirm_status: {
            type: 'boolean',
            description:
              'Boolean xác nhận: true = xác nhận/approve (sự kiện được công nhận), false = reject (không công nhận). Khi true, server thường set `acknowledged_at` và `acknowledged_by` từ token.',
            example: true,
          },
          notes: {
            type: 'string',
            nullable: true,
            description:
              'Ghi chú kèm theo hành động xác nhận hoặc từ chối (max ~1000 ký tự). Dùng để lưu lý do hoặc feedback; server sẽ sanitize và trim nếu cần.',
            maxLength: 1000,
            example: 'Đã xác nhận tại hiện trường bởi caregiver',
          },
        },
        required: ['confirm_status'],
        example: { confirm_status: true, notes: 'Đã xác nhận tại hiện trường' },
      },
    }),
    ApiResponse({ status: 200, description: 'Trả về object event đã được cập nhật' }),
  ),
};
