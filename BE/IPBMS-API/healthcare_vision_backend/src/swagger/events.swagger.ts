import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiOkResponse,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { EventStatusEnum, EventTypeEnum, EventLifecycleEnum } from '../core/entities/events.entity';
import {
  PendingProposalsResponseDto,
  ProposalsResponseDto,
  ProposalDetailsResponseDto,
  ConfirmationHistoryResponseDto,
} from '../application/dto/events/event-confirmation-response.dto';

/** Schema snippet dùng lại giữa các response */
const SnapshotItemSchema = {
  type: 'object',
  properties: {
    snapshot_id: { type: 'string', format: 'uuid' },
    captured_at: { type: 'string', format: 'date-time' },
    cloud_url: { type: 'string', nullable: true },
    image_path: { type: 'string', nullable: true },
  },
};

const EventWithImagesSchema = {
  type: 'object',
  properties: {
    event_id: { type: 'string', format: 'uuid' },
    user_id: { type: 'string', format: 'uuid' },
    camera_id: { type: 'string', format: 'uuid' },
    room_id: { type: 'string', format: 'uuid', nullable: true },
    event_type: { type: 'string', enum: Object.values(EventTypeEnum) },
    status: {
      type: 'string',
      enum: Object.values(EventStatusEnum),
      nullable: true,
    },
    confirmation_state: { type: 'string', nullable: true },
    pending_until: { type: 'string', format: 'date-time', nullable: true },
    proposed_by: { type: 'string', format: 'uuid', nullable: true },
    previous_status: { type: 'string', nullable: true, enum: Object.values(EventStatusEnum) },
    pending_reason: { type: 'string', nullable: true },
    confirm_status: { type: 'boolean', nullable: true },
    detected_at: { type: 'string', format: 'date-time' },
    confidence_score: {
      type: 'number',
      nullable: true,
      description: 'Điểm tin cậy (số, ví dụ 0..1 hoặc 0..100 tuỳ hệ thống)',
    },
    notes: { type: 'string', nullable: true },
    images: {
      type: 'array',
      items: { type: 'string' },
      description: 'Danh sách URL ảnh đã COALESCE',
    },
  },
};

const ORDER_FIELDS = ['created_at', 'detected_at', 'confidence_score'];

export const EventsSwagger = {
  /** GET /events */
  list: applyDecorators(
    ApiOperation({
      summary: 'Lấy danh sách tất cả events với phân trang và bộ lọc',
      description: `
    API lấy danh sách events với hỗ trợ phân trang, sắp xếp và nhiều bộ lọc linh hoạt.

    **Quyền truy cập:**
    - **Admin**: Xem tất cả events trong hệ thống
    - **Customer**: Chỉ xem events của chính mình
    - **Caregiver**: Chỉ xem events của các customer được assign

    **Bộ lọc có sẵn:**
    - **dateFrom/dateTo**: Lọc theo khoảng thời gian created_at (ISO datetime)
    - **status**: Lọc theo trạng thái event (comma-separated)
  - **lifecycle_state**: Lọc theo trạng thái vòng đời (comma-separated: ${Object.values(EventLifecycleEnum).join(', ')})
    - **type**: Lọc theo loại event (comma-separated: fall, abnormal_behavior, emergency, normal_activity, sleep)
    - **camera_id**: Lọc theo camera cụ thể
  - **orderBy**: Sắp xếp theo trường (created_at, detected_at, confidence_score)
    - **order**: Thứ tự sắp xếp (ASC, DESC)

    **Phân trang:**
    - **page**: Số trang (bắt đầu từ 1)
    - **limit**: Số items per page (mặc định không giới hạn)

    **Response:** Trả về object chứa items (mảng events), total (tổng số), page, limit
    `,
    }),
    ApiResponse({
      status: 200,
      description: 'Danh sách events thành công',
      schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                event_id: { type: 'string', format: 'uuid', description: 'ID duy nhất của event' },
                user_id: {
                  type: 'string',
                  format: 'uuid',
                  description: 'ID của user sở hữu event',
                },
                camera_id: {
                  type: 'string',
                  format: 'uuid',
                  description: 'ID của camera ghi nhận',
                },
                room_id: {
                  type: 'string',
                  format: 'uuid',
                  nullable: true,
                  description: 'ID phòng (optional)',
                },
                event_type: {
                  type: 'string',
                  enum: Object.values(EventTypeEnum),
                  description: `Loại event. Giá trị hợp lệ: ${Object.values(EventTypeEnum).join(', ')}`,
                },
                status: {
                  type: 'string',
                  enum: Object.values(EventStatusEnum),
                  nullable: true,
                  description: `Trạng thái event. Giá trị hợp lệ: ${Object.values(EventStatusEnum).join(', ')}`,
                },
                lifecycle_state: {
                  type: 'string',
                  enum: Object.values(EventLifecycleEnum),
                  description: 'Trạng thái vòng đời',
                },
                confidence_score: {
                  type: 'number',
                  nullable: true,
                  description: 'Điểm tin cậy (số, ví dụ 0..1 hoặc 0..100 tuỳ hệ thống)',
                },
                detected_at: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Thời gian phát hiện',
                },
                notes: { type: 'string', nullable: true, description: 'Ghi chú bổ sung' },
                images: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Danh sách URL ảnh',
                },
                confirmation_state: {
                  type: 'string',
                  nullable: true,
                  description: 'Trạng thái xác nhận',
                },
                pending_until: {
                  type: 'string',
                  format: 'date-time',
                  nullable: true,
                  description: 'Thời hạn chờ xác nhận',
                },
                proposed_by: {
                  type: 'string',
                  format: 'uuid',
                  nullable: true,
                  description: 'Người đề xuất thay đổi',
                },
                previous_status: {
                  type: 'string',
                  nullable: true,
                  description: 'Trạng thái trước đó',
                },
                pending_reason: { type: 'string', nullable: true, description: 'Lý do đang chờ' },
                confirm_status: {
                  type: 'boolean',
                  nullable: true,
                  description: 'Trạng thái xác nhận',
                },
              },
            },
            description: 'Mảng các event objects',
          },
          total: { type: 'number', description: 'Tổng số events (không phụ thuộc vào phân trang)' },
          page: { type: 'number', description: 'Trang hiện tại' },
          limit: {
            type: 'number',
            nullable: true,
            description: 'Số items per page (null nếu không giới hạn)',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Tham số không hợp lệ (ví dụ: event_type không đúng định dạng)',
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden - Không có quyền truy cập events này',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Số trang (bắt đầu từ 1)',
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Số items per page',
      example: 50,
    }),
    ApiQuery({
      name: 'dateFrom',
      required: false,
      description: 'Lọc từ ngày (ISO datetime). Ví dụ: 2025-11-01T00:00:00Z',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      description: 'Lọc đến ngày (ISO datetime). Ví dụ: 2025-11-04T23:59:59Z',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      description: `Lọc theo trạng thái event (comma-separated). Giá trị hợp lệ: ${Object.values(
        EventStatusEnum,
      ).join(', ')}. Ví dụ: danger,warning`,
      example: Object.values(EventStatusEnum)[0],
    }),
    ApiQuery({
      name: 'lifecycle_state',
      required: false,
      enum: Object.values(EventLifecycleEnum),
      description:
        'Lọc theo trạng thái vòng đời (comma-separated). Ví dụ: EMERGENCY_RESPONSE_RECEIVED, RESOLVED',
      example: 'EMERGENCY_RESPONSE_RECEIVED',
    }),
    ApiQuery({
      name: 'type',
      required: false,
      description: `Lọc theo loại event (comma-separated). Giá trị hợp lệ: ${Object.values(
        EventTypeEnum,
      ).join(', ')}. Ví dụ: fall,emergency,abnormal_behavior`,
      example: Object.values(EventTypeEnum)[0],
    }),
    ApiQuery({
      name: 'orderBy',
      required: false,
      enum: ORDER_FIELDS,
      description: 'Sắp xếp theo trường',
      example: 'created_at',
    }),
    ApiQuery({
      name: 'order',
      required: false,
      enum: ['ASC', 'DESC'],
      description: 'Thứ tự sắp xếp',
      example: 'DESC',
    }),
    ApiQuery({
      name: 'camera_id',
      required: false,
      description: 'Lọc theo camera ID (UUID)',
    }),
  ),

  /** Swagger decorators for proposals/confirmation endpoints */
  pendingProposals: applyDecorators(
    ApiExtraModels(PendingProposalsResponseDto),
    ApiOkResponse({
      description: 'Pending proposals for the current user',
      schema: { $ref: getSchemaPath(PendingProposalsResponseDto) },
    }),
  ),

  proposals: applyDecorators(
    ApiExtraModels(ProposalsResponseDto),
    ApiOkResponse({
      description: 'Proposals list (paginated)',
      schema: { $ref: getSchemaPath(ProposalsResponseDto) },
    }),
  ),

  proposalDetails: applyDecorators(
    ApiExtraModels(ProposalDetailsResponseDto),
    ApiOkResponse({
      description: 'Proposal details with history',
      schema: { $ref: getSchemaPath(ProposalDetailsResponseDto) },
    }),
  ),

  confirmationHistory: applyDecorators(
    ApiExtraModels(ConfirmationHistoryResponseDto),
    ApiOkResponse({
      description: 'Event confirmation history',
      schema: { $ref: getSchemaPath(ConfirmationHistoryResponseDto) },
    }),
  ),

  history: applyDecorators(
    ApiOperation({
      summary: 'Lấy lịch sử event — mặc định trả kèm `changes` và `change_count`',
      description: `Endpoint trả về các bản ghi lịch sử (history entries) liên quan tới một event.

- Mỗi bản ghi lịch sử được 'mở rộng' (expanded) để kèm:
  - \`change_count\`: số trường bị thay đổi trên entry.
  - \`changes\`: mảng các diff theo trường; mỗi phần tử chứa: \`field\`, \`path\`, \`old\`, \`new\`.

Query parameter: \`expand_limit\` (integer, optional) — giới hạn số phần tử trong \`changes\` được trả về cho mỗi entry.
- Default = 20
- Max = 100
- Hành vi:
  - Nếu \`expand_limit\` <= 0 hoặc không phải integer → server trả HTTP 400 (Bad Request).
  - Nếu \`expand_limit\` > 100 → server sẽ clamp giá trị về 100 (không trả lỗi).
  - Nếu không truyền → server dùng default = 20.

Ghi chú về kiểu dữ liệu trong \`changes\`:
- \`changes[].old\` và \`changes[].new\` có thể là primitive (string/number/boolean), null, object hoặc array. Client nên xử lý giá trị theo kiểu động.
- \`changes[].path\` là dot-separated path từ root của entity (ví dụ: 'metadata.camera.location').

Migration note: trước đây API có thể trả ở dạng legacy flattened/split; clients cũ cần cập nhật để tiêu thụ \`changes\` array hoặc dùng \`expand_limit\` nhỏ hơn để giảm băng thông.

Examples have been added to the response schema below (summary + expanded examples).

Performance note (experimental): building per-entry \`changes[]\` can be expensive at scale (DB N+1 or heavy aggregation). Use \`summary=true\` for list endpoints or keep \`pageSize\` small when requesting expanded responses. Consider server-side aggregation (single-query) if you need expanded diffs for large pages.
`,
    }),
    ApiParam({ name: 'event_id', type: 'string', format: 'uuid' }),
    ApiQuery({
      name: 'expand_limit',
      required: false,
      example: 20,
      schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
      description:
        'Số phần tử trong `changes` trả về cho mỗi history entry. Default 20, Max 100. Giá trị >100 sẽ được clamp về 100; giá trị <=0 hoặc không phải integer → 400.',
    }),
    ApiOkResponse({
      description: 'Array of event history entries augmented with per-field changes',
      schema: {
        type: 'object',
        properties: {
          event_id: { type: 'string', format: 'uuid' },
          history: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                history_id: { type: 'string', format: 'uuid' },
                action: { type: 'string' },
                actor_id: {
                  type: 'string',
                  format: 'uuid',
                  nullable: true,
                  description: 'Nullable if action performed by system/cron or actor removed.',
                },
                actor_name: {
                  type: 'string',
                  nullable: true,
                  description: 'Nullable if action performed by system/cron or actor removed.',
                },
                previous_status: { type: 'string', nullable: true },
                new_status: { type: 'string', nullable: true },
                previous_event_type: { type: 'string', nullable: true },
                new_event_type: { type: 'string', nullable: true },
                previous_confirmation_state: { type: 'string', nullable: true },
                new_confirmation_state: { type: 'string', nullable: true },
                reason: { type: 'string', nullable: true },
                metadata: { type: 'object', nullable: true },
                created_at: { type: 'string', format: 'date-time' },
                change_count: { type: 'number' },
                changes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      path: {
                        type: 'string',
                        description:
                          "Dot-separated path from root object (ví dụ: 'status' hoặc 'metadata.camera.id').",
                      },
                      old: {
                        description: 'Primitive | object | array | null',
                        oneOf: [
                          { type: 'string' },
                          { type: 'number' },
                          { type: 'boolean' },
                          { type: 'object' },
                          { type: 'array' },
                          { type: 'null' },
                        ],
                      },
                      new: {
                        description: 'Primitive | object | array | null',
                        oneOf: [
                          { type: 'string' },
                          { type: 'number' },
                          { type: 'boolean' },
                          { type: 'object' },
                          { type: 'array' },
                          { type: 'null' },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        example: {
          summary_example: {
            items: [
              {
                event_id: 'evt_1',
                last_action: 'proposed',
                last_actor_id: 'user_1',
                last_changed_at: '2025-10-04T06:16:00.000Z',
                change_count: 2,
              },
            ],
            total: 1,
            page: 1,
            limit: 50,
          },
          expanded_example: {
            event_id: 'evt_1',
            history: [
              {
                history_id: 'h1',
                action: 'proposed',
                actor_id: 'u1',
                previous_status: 'normal',
                new_status: 'warning',
                reason: 'Detected unusual movement',
                created_at: '2025-10-04T06:16:00.000Z',
                change_count: 2,
                changes: [
                  { field: 'status', old: 'normal', new: 'warning', path: 'status' },
                  {
                    field: 'event_type',
                    old: 'normal_activity',
                    new: 'abnormal_behavior',
                    path: 'event_type',
                  },
                ],
              },
            ],
          },
        },
      },
    }),
  ),
  /** POST /events/alarm */
  alarm: applyDecorators(
    ApiOperation({
      summary: 'Kích hoạt báo động (alarm): tạo/đính kèm ảnh và sự kiện',
      description: `
Khi người dùng bấm nút alarm:

• Nếu truyền event_id: hệ thống tạo snapshot (từ ảnh gửi kèm, nếu có) và đính kèm vào event đó, rồi đặt lifecycle = ALARM_ACTIVATED để ngăn tự động leo thang.

• Nếu không có event_id: hệ thống tạo snapshot (nếu có ảnh), sau đó tạo event mới tham chiếu snapshot vừa tạo và đặt lifecycle = ALARM_ACTIVATED.

Yêu cầu:
- Có thể gửi kèm ảnh qua field "image_files" (multipart).
- Cần camera_id khi tạo event mới (không cần khi đã có event_id).

Kết quả:
- Trả về thông tin event và snapshot đã tạo/đính kèm.
- Lifecycle được cập nhật để dừng worker escalate tự động.
Ghi chú thêm:
- Server sẽ tự động thêm trigger: 'alarm' vào context_data/metadata của event để phân biệt nguồn tạo (alarm).
  `,
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      required: false,
      schema: {
        type: 'object',
        properties: {
          event_id: { type: 'string', format: 'uuid' },
          camera_id: { type: 'string', format: 'uuid' },
          event_type: { type: 'string', enum: Object.values(EventTypeEnum), nullable: true },
          status: { type: 'string', enum: Object.values(EventStatusEnum), nullable: true },
          metadata: { type: 'object', nullable: true },
          notes: { type: 'string', nullable: true },
          image_files: {
            type: 'string',
            format: 'binary',
            description:
              'Upload một hoặc nhiều file. Gửi nhiều lần phần multipart với cùng tên field "image_files" (tối đa 4).',
          },
        },
        example: {
          event_id: null,
          camera_id: 'uuid-camera-1234',
          event_type: 'emergency',
          status: 'danger',
          metadata: { location: 'bedroom', source: 'alarm_button' },
          notes: 'User pressed alarm button',
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Trả về event (cập nhật hoặc mới) và snapshot đã tạo',
      schema: {
        type: 'object',
        properties: {
          event: EventWithImagesSchema,
          snapshot: SnapshotItemSchema,
        },
        example: {
          event: {
            event_id: 'evt-1234',
            user_id: 'uuid-user-5678',
            camera_id: 'uuid-camera-1234',
            event_type: 'emergency',
            status: 'danger',
            detected_at: '2025-11-07T06:00:00Z',
            images: ['https://cdn.example.com/snapshots/1.jpg'],
            lifecycle_state: 'ALARM_ACTIVATED',
          },
          snapshot: {
            snapshot_id: 'snap-1234',
            captured_at: '2025-11-07T06:00:00Z',
            cloud_url: 'https://res.cloudinary.com/example/image/upload/v1234/abc.jpg',
            image_path: 'example/public_id',
          },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Bad Request - missing/invalid params' }),
    ApiResponse({ status: 403, description: 'Forbidden - no access to event or patient' }),
    ApiResponse({ status: 500, description: 'Internal Server Error' }),
  ),

  updateLifecycle: applyDecorators(
    ApiOperation({ summary: 'Cập nhật lifecycle_state của event' }),
    ApiParam({ name: 'event_id', required: true, description: 'UUID của event' }),
    ApiBody({
      description: 'Lifecycle state update payload',
      schema: {
        type: 'object',
        properties: {
          lifecycle_state: {
            type: 'string',
            description: 'Giá trị lifecycle_state mới',
            enum: Object.values(EventLifecycleEnum),
            example: 'VERIFIED',
          },
          notes: { type: 'string', description: 'Ghi chú (tuỳ chọn)' },
        },
        required: ['lifecycle_state'],
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Event lifecycle updated. Trả về chi tiết event đã được chuẩn hoá',
    }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - lifecycle_state không hợp lệ hoặc event không tồn tại',
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden - Không có quyền cập nhật lifecycle của event này',
    }),
  ),

  /** GET /events/changed-by */
  changedBy: applyDecorators(
    ApiOperation({
      summary: 'Lấy danh sách events thay đổi bởi một actor (changed-by)',
      description:
        'Trả về các events mà actor (user/system) cụ thể đã tác động (ví dụ: propose, confirm, update). Dùng để audit hành vi của actor.',
    }),
    ApiQuery({
      name: 'actor_id',
      required: true,
      description: 'UUID của actor (user) cần lọc',
    }),
    ApiQuery({ name: 'page', required: false, description: 'Trang (1-based)', example: 1 }),
    ApiQuery({ name: 'limit', required: false, description: 'Số bản ghi/trang', example: 50 }),
    ApiQuery({
      name: 'dateFrom',
      required: false,
      description: 'ISO datetime - lọc từ created_at >= dateFrom',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      description: 'ISO datetime - lọc created_at < dateTo',
    }),
    ApiQuery({
      name: 'summary',
      required: false,
      description:
        'Nếu true thì trả về các bản ghi tổng hợp (summary) mà KHÔNG expand changes. Gọi ?summary=true để bật.',
      example: false,
    }),
    ApiQuery({
      name: 'orderBy',
      required: false,
      description: "Trường sắp xếp (ví dụ: 'detected_at')",
    }),
    ApiQuery({
      name: 'order',
      required: false,
      description: "'ASC' hoặc 'DESC'",
    }),
    ApiOkResponse({
      description: 'Danh sách event do actor thực hiện (paginated)',
      schema: {
        type: 'object',
        properties: {
          items: { type: 'array', items: EventWithImagesSchema },
          total: { type: 'number' },
          page: { type: 'number' },
          limit: { type: 'number' },
        },
      },
    }),
  ),

  /** GET /events/recent/:user_id */
  recent: applyDecorators(
    ApiOperation({ summary: 'Events gần đây theo user' }),
    ApiQuery({ name: 'limit', required: false, example: 50 }),
    ApiParam({
      name: 'userId',
      description: 'Patient/User UUID (v4)',
      format: 'uuid',
    }),
    ApiOkResponse({
      schema: {
        type: 'array',
        items: EventWithImagesSchema,
        example: [
          {
            event_id: 'uuid',
            event_type: 'fall',
            detected_at: '2025-08-19T03:00:00.000Z',
            images: ['https://.../frame.jpg'],
          },
        ],
      },
    }),
  ),

  /** GET /events/:event_id */
  getDetail: applyDecorators(
    ApiOperation({ summary: 'Chi tiết event (kèm images)' }),
    ApiParam({ name: 'event_id', description: 'Event UUID', format: 'uuid' }),
    ApiOkResponse({
      schema: {
        type: 'object',
        properties: {
          ...EventWithImagesSchema.properties,
          snapshot: {
            type: 'object',
            nullable: true,
            properties: {
              snapshot_id: { type: 'string', format: 'uuid' },
              cloud_url: { type: 'string', nullable: true },
              image_path: { type: 'string', nullable: true },
            },
          },
          camera: {
            type: 'object',
            nullable: true,
            properties: {
              camera_id: { type: 'string', format: 'uuid' },
              camera_name: { type: 'string', nullable: true },
            },
          },
        },
        example: {
          event_id: 'uuid',
          user_id: 'uuid',
          event_type: 'fall',
          status: 'warning',
          images: ['https://.../frame.jpg'],
          snapshot: { snapshot_id: 'uuid', cloud_url: 'https://...' },
          camera: { camera_id: 'uuid', camera_name: 'Cam 1' },
        },
      },
    }),
  ),

  /** PATCH /events/:event_id  (update status) */
  patchStatus: applyDecorators(
    ApiOperation({
      summary:
        'Cập nhật trạng thái và loại event (status: danger | warning | normal, event_type: fall | abnormal_behavior | emergency | normal_activity | sleep)',
    }),
    ApiParam({ name: 'event_id', description: 'Event UUID', format: 'uuid' }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: Object.values(EventStatusEnum),
      description: 'Trạng thái mới cho event. Giá trị hợp lệ: danger, warning, normal',
      example: 'warning',
    }),
    ApiQuery({ name: 'notes', required: false, description: 'Ghi chú (tùy chọn)' }),
    ApiQuery({
      name: 'event_type',
      required: false,
      enum: Object.values(EventTypeEnum),
      description:
        'Loại event mới. Giá trị hợp lệ: fall, abnormal_behavior, emergency, normal_activity, sleep',
      example: 'fall',
    }),
    ApiOkResponse({
      description: 'Cập nhật thành công',
      schema: {
        type: 'object',
        properties: {
          ...EventWithImagesSchema.properties,
          updated_at: { type: 'string', format: 'date-time', nullable: true },
        },
        example: {
          event_id: 'uuid',
          status: 'warning',
          notes: 'Check camera lại',
          images: ['https://.../frame.jpg'],
          updated_at: '2025-08-19T03:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description:
        'Yêu cầu không hợp lệ (ví dụ: status không hợp lệ hoặc đã quá thời hạn caregiver)',
    }),
    ApiResponse({
      status: 403,
      description:
        'Không có quyền (caregiver không được phân công / chưa xác thực / người dùng không đăng nhập)',
    }),
  ),

  /** PATCH /events/:event_id/confirm (boolean confirm + legacy mapping) */
  patchConfirm: applyDecorators(
    ApiOperation({
      summary:
        'Cập nhật confirm (boolean) (LEGACY - deprecated). Customer/Caregiver có thể xác nhận event. Hỗ trợ legacy confirm_status → map sang boolean',
      deprecated: true,
      description:
        'Đây là endpoint cũ (PATCH) để cập nhật confirm bằng query param boolean. Đã có endpoint POST /events/{event_id}/confirm hỗ trợ body { action: "approve" | "reject" } với mô tả trường chi tiết — khuyến nghị FE dùng POST thay vì PATCH.',
    }),
    ApiParam({ name: 'event_id', description: 'Event UUID', format: 'uuid' }),
    ApiQuery({
      name: 'confirm',
      required: false,
      schema: { oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['true', 'false'] }] },
      example: true,
      description:
        'Xác nhận true/false. FE có thể truyền boolean (true/false) hoặc string "true"/"false". Nếu không truyền, có thể dùng confirm_status (legacy mapping). Khi có proposal và bạn là customer, backend sẽ áp dụng proposed_status; khi không có proposal, trường này cập nhật confirm_status/acknowledged. Ví dụ gọi: PATCH /events/{event_id}/confirm?confirm=true',
    }),
    ApiQuery({
      name: 'confirm_status',
      required: false,
      enum: ['normal', 'warning', 'danger'],
      description: '[LEGACY] normal → false; warning|danger → true',
    }),
    ApiQuery({ name: 'notes', required: false, description: 'Ghi chú (tùy chọn)' }),
    ApiOkResponse({
      description: 'Cập nhật confirm thành công',
      schema: {
        type: 'object',
        properties: {
          ...EventWithImagesSchema.properties,
          updated_at: { type: 'string', format: 'date-time', nullable: true },
        },
        example: {
          event_id: 'uuid',
          confirm_status: true,
          notes: 'Đã xác nhận nguy hiểm',
          images: ['https://.../frame.jpg'],
          updated_at: '2025-08-19T03:00:00.000Z',
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Thiếu confirm/confirm_status hoặc không hợp lệ' }),
    ApiResponse({
      status: 403,
      description:
        'Không có quyền thực hiện hành động này (ví dụ: caregiver cố ghi đè xác nhận cuối cùng của khách hàng)',
    }),
  ),

  /** GET /events/:event_id/snapshots */
  snapshots: applyDecorators(
    ApiOperation({
      summary:
        'Lấy mảng ảnh (snapshots) của event. Mặc định trả đúng snapshot gắn với event; có thể mở rộng theo windowSec',
    }),
    ApiParam({ name: 'event_id', description: 'Event UUID', format: 'uuid' }),
    ApiQuery({
      name: 'windowSec',
      required: false,
      example: 0,
      description: 'Nếu > 0: trả các snapshot cùng camera trong ±windowSec giây quanh detected_at',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      example: 50,
      description: 'Giới hạn số snapshot khi dùng windowSec (mặc định 50, tối đa 500)',
    }),
    ApiOkResponse({
      description: 'Danh sách snapshot của event',
      schema: {
        type: 'object',
        properties: {
          event_id: { type: 'string', format: 'uuid' },
          snapshots: {
            type: 'array',
            items: SnapshotItemSchema,
          },
        },
        example: {
          event_id: 'uuid',
          snapshots: [
            {
              snapshot_id: 'uuid',
              captured_at: '2025-08-19T03:00:00.000Z',
              cloud_url: 'https://cdn.example/s1.jpg',
              image_path: null,
            },
          ],
        },
      },
    }),
  ),
  /** POST /events/:event_id/propose */
  propose: applyDecorators(
    ApiOperation({
      summary: 'Caregiver đề xuất thay đổi trạng thái/loại event (tạo proposal)',
      description:
        'Caregiver tạo một proposal (đề xuất) để thay đổi giá trị hiển thị của event (ví dụ: status hoặc event_type). Đây là staging workflow: khi caregiver propose, server sẽ không thay đổi trường canonical `status`/`event_type` ngay lập tức; thay vào đó server lưu giá trị mới vào `proposed_status`/`proposed_event_type`, set `confirmation_state = CAREGIVER_UPDATED` và đặt `pending_until` (TTL) để chờ customer/owner quyết định.\n\nMục tiêu: cho phép caregiver gợi ý thay đổi mà không ghi đè quyết định cuối cùng của customer.\n\nImportant behavior notes:\n- Proposal chỉ lưu vào các trường `proposed_*` và KHÔNG thay đổi `status`/`event_type` cho tới khi customer approve.\n- `pending_until` mặc định = 48 giờ nếu không cung cấp; nếu thời hạn đã qua, hệ thống có thể auto-approve/auto-reject theo policy.\n- Chỉ một proposal có thể tồn tại cho event tại một thời điểm; nếu đã có proposal đang chờ, server trả 409.\n\nRequest body (summary): proposed_status (required), proposed_event_type (optional), pending_until (ISO UTC, optional), reason (optional, max 240 chars).\nErrors: 400 = invalid request, 403 = not caregiver, 409 = existing pending proposal.',
    }),
    ApiParam({ name: 'event_id', description: 'Event UUID', format: 'uuid' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          proposed_status: {
            type: 'string',
            enum: Object.values(EventStatusEnum),
            description:
              "Required. Kiểu: string. Giá trị hợp lệ (chính xác, chữ thường): 'danger' | 'warning' | 'normal'. Ý nghĩa: trạng thái mới caregiver đề xuất. FE: hiển thị label tiếng Việt tương ứng (danger → 'Nguy hiểm', warning → 'Cần chú ý', normal → 'Bình thường') và validate trước khi gửi. Lưu ý: gửi chính xác chữ thường, không kèm khoảng trắng. Khi proposal được chấp nhận (bằng customer hoặc auto-approve) trường 'status' của event sẽ được cập nhật thành giá trị này. FE nên hiển thị tooltip/giải thích ngắn cho mỗi giá trị và ngăn gửi nếu giá trị không hợp lệ.",
            example: 'warning',
          },
          pending_until: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description:
              'Optional. ISO 8601 UTC datetime. Nếu không cung cấp, server mặc định TTL = 48 giờ từ request time. Nếu gửi thời điểm trong quá khứ, server có thể xử lý ngay (auto-approve/auto-reject) theo policy. FE: gửi UTC ISO string.',
            example: '2025-10-10T12:00:00Z',
          },
          reason: {
            type: 'string',
            nullable: true,
            description:
              'Optional. Kiểu: string. Ghi chú ngắn giải thích lý do đề xuất; sẽ hiển thị cho customer và trong notification. KHÔNG gửi dữ liệu nhạy cảm. FE nên giới hạn 240 ký tự (server có thể trim hoặc cắt ngắn). Nên loại bỏ/escape HTML và ký tự điều khiển trước khi gửi để tránh XSS; server cũng có thể sanitize đầu vào.',
            maxLength: 240,
            example: 'Thấy người ngã, nghi do trượt chân',
          },
        },
        required: ['proposed_status'],
        example: {
          proposed_status: 'normal',
          pending_until: '2025-10-10T12:00:00Z',
          reason: 'Có vẻ do thú nuôi',
        },
      },
    }),
    ApiOkResponse({
      description:
        'Đã tạo proposal thành công. Response chứa event với: status/event_type **GIỮ NGUYÊN** giá trị ban đầu (chưa thay đổi), proposed_status/proposed_event_type chứa giá trị đề xuất, confirmation_state = CAREGIVER_UPDATED, pending_until (deadline), proposed_by (caregiver ID), proposed_reason.',
      schema: {
        type: 'object',
        properties: {
          ...EventWithImagesSchema.properties,
          confirmation_state: { type: 'string' },
          pending_until: { type: 'string', format: 'date-time', nullable: true },
          proposed_status: { type: 'string', nullable: true },
          proposed_event_type: { type: 'string', nullable: true },
          proposed_reason: { type: 'string', nullable: true },
          proposed_by: { type: 'string', format: 'uuid', nullable: true },
          // Helpful for clients: indicate whether this proposal is actionable by the current user
          can_current_user_approve: { type: 'boolean', nullable: true },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description:
        'Yêu cầu không hợp lệ. Ví dụ: proposed_status không thuộc [danger,warning,normal] hoặc pending_until không phải ISO date. Hoặc event không tồn tại.',
    }),
    ApiResponse({
      status: 409,
      description:
        'Conflict - Đã có đề xuất đang chờ cho event này. FE nên hiển thị trạng thái "Đã có đề xuất đang chờ" và không cho phép gửi thêm.',
    }),
    ApiResponse({ status: 403, description: 'Không có quyền (chỉ caregiver được phép)' }),
  ),

  /** POST /events/:event_id/confirm */
  postConfirm: applyDecorators(
    ApiOperation({
      summary: 'Customer/Caregiver xác nhận (approve) đề xuất',
      description:
        "Xử lý quyết định của customer (hoặc caregiver trong một số legacy flow) đối với một proposal đã tồn tại. Key behaviors: Nếu action='approve' và event.confirmation_state = 'CAREGIVER_UPDATED' thì server áp dụng các trường `proposed_*` lên `status` / `event_type`, set `confirmation_state = CONFIRMED_BY_CUSTOMER`, clear các trường `proposed_*`, ghi `acknowledged_by`/`acknowledged_at` và tạo `event_history` entry. Nếu action='reject' thì server clear `proposed_*`, set `confirmation_state = REJECTED_BY_CUSTOMER` (và ghi lịch sử). `status`/`event_type` KHÔNG thay đổi. Đây là bước customer-facing để CHẤP NHẬN hoặc TỪ CHỐI một proposal do caregiver tạo. Notes on differences vs /events/:event_id/verify: /propose tạo đề xuất (staging) nhưng KHÔNG quyết định canonical state. /confirm (this endpoint) là hành động của customer để áp dụng hoặc từ chối proposal. /verify là endpoint canonical (final) có thể dùng bởi customer/admin/system để xác minh/duyệt/từ chối/hủy event; verify cập nhật `verification_status` và là hành động audit quan trọng. Request body: action (approve|reject) required; notes optional (max 240 chars). Errors: 400 = invalid body, 403 = forbidden, 409 = no pending proposal.",
    }),
    ApiParam({ name: 'event_id', description: 'Event UUID', format: 'uuid' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['approve', 'reject'],
            description:
              "Required. 'approve' = chấp nhận proposal (áp dụng proposed_status → status); 'reject' = từ chối (giữ nguyên status ban đầu, clear proposed_*). FE: hiện modal xác nhận trước khi gửi.",
            example: 'approve',
          },
          notes: {
            type: 'string',
            nullable: true,
            description: 'Optional. Ghi chú đi kèm quyết định. FE nên giới hạn 240 ký tự.',
            maxLength: 240,
            example: 'Xác nhận đã xử lý xong',
          },
        },
        required: ['action'],
        example: { action: 'approve' },
      },
    }),
    ApiOkResponse({
      description:
        'Đã xử lý đề xuất. Nếu action=approve: status/event_type được CẬP NHẬT từ proposed_*, confirmation_state = CONFIRMED_BY_CUSTOMER. Response chứa event với giá trị mới.',
    }),
    ApiResponse({
      status: 400,
      description:
        'Yêu cầu không hợp lệ. Ví dụ: không tồn tại proposal đang chờ (confirmation_state != CAREGIVER_UPDATED), action không hợp lệ.',
    }),
    ApiResponse({
      status: 403,
      description:
        'Không có quyền. Customer không sở hữu event hoặc caregiver cố approve thay cho customer.',
    }),
  ),

  /** POST /events/:event_id/reject */
  postReject: applyDecorators(
    ApiOperation({
      summary: 'Customer/Caregiver từ chối (reject) đề xuất',
      description: `**Customer:** Từ chối proposal từ caregiver. **KHÔNG thay đổi status/event_type** (Staging Approach - status chưa bao giờ thay đổi cho đến khi approve). Chỉ clear các trường proposed_* và set confirmation_state = REJECTED_BY_CUSTOMER.

**Caregiver:** Legacy flow - gọi EventsService.updateConfirm với confirm=false.

**Customer flow (Staging Approach):**
1. Kiểm tra confirmation_state = CAREGIVER_UPDATED (có pending proposal)
2. **GIỮ NGUYÊN status và event_type** (không cần revert vì chưa bao giờ thay đổi)
3. Set confirmation_state = REJECTED_BY_CUSTOMER
4. Clear proposed_status, proposed_event_type, proposed_reason
5. Lưu acknowledged_by, acknowledged_at
6. Gửi thông báo FCM cho caregiver

**Staging Approach - Quan trọng:**
- Status và event_type **KHÔNG thay đổi** cho đến khi customer approve
- Khi reject: chỉ clear proposal fields, status giữ nguyên giá trị ban đầu
- Không cần previous_* fields vì không có gì để revert

**Request body:**
- action: 'reject' (required)
- notes/rejection_reason: Lý do từ chối (optional, max 240 chars)

**Error codes:**
- 409: Không có proposal đang chờ (message: "Không có đề xuất nào đang chờ từ chối")
- 403: Không có quyền`,
    }),
    ApiParam({ name: 'event_id', description: 'Event UUID', format: 'uuid' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          notes: {
            type: 'string',
            nullable: true,
            description:
              'Optional. Lý do từ chối (hiển thị cho caregiver). FE nên giới hạn 240 ký tự. Được map vào rejected_reason trong response.',
            maxLength: 240,
            example: 'Không phải sự kiện ngã, chỉ là thú nuôi đi qua',
          },
          action: {
            type: 'string',
            enum: ['reject'],
            description:
              "Khai báo 'reject' để rõ intent. (POST /events/:id/reject là shortcut cho action=reject).",
          },
        },
        required: ['action'],
        example: { action: 'reject', notes: 'Không phải sự kiện ngã' },
      },
    }),
    ApiOkResponse({
      description:
        'Đã từ chối đề xuất. Trả về event với: status/event_type GIỮ NGUYÊN giá trị ban đầu (không thay đổi), proposed_* = null, confirmation_state = REJECTED_BY_CUSTOMER.',
    }),
    ApiResponse({
      status: 400,
      description:
        'Yêu cầu không hợp lệ (ví dụ: không có proposal đang chờ để từ chối hoặc event không tồn tại)',
    }),
    ApiResponse({ status: 403, description: 'Không có quyền' }),
  ),

  /** POST /events/:event_id/verify */
  verify: applyDecorators(
    ApiOperation({
      summary: 'Xác minh/duyệt/từ chối/hủy một event (verify)',
      description:
        'Endpoint để caregiver/customer hoặc hệ thống (cron/operator) ghi nhận quyết định cuối cùng cho một event.\n\n' +
        'Hành động hợp lệ (body.action):\n' +
        "- 'APPROVED': Áp dụng quyết định cuối cùng (ví dụ: khi có proposal, áp dụng proposed_status → status). Ghi nhận vào audit (event_history) action = 'VERIFIED'/'APPROVED'.\n" +
        "- 'REJECTED': Từ chối proposal (nếu có). Không thay đổi status chính của event nếu server áp dụng staging approach — chỉ clear các trường proposed_* và ghi lịch sử.\n" +
        "- 'CANCELED': Hủy/mark event là không cần xử lý (sets is_canceled = true, verification_status = 'CANCELED').\n\n" +
        'Hành vi phụ:\n' +
        "- Ghi 'last_action_by'/'last_action_at' từ user hiện tại.\n" +
        "- Cập nhật 'verification_status' tương ứng: PENDING -> APPROVED/REJECTED/CANCELED.\n" +
        "- Tạo bản ghi 'event_history' để audit (actor, action, reason/notes).\n\n" +
        'Quyền truy cập: caregiver hoặc customer hợp lệ cho event; một số hành động có thể giới hạn cho role cụ thể (ví dụ: chỉ admin được override).',
    }),
    ApiParam({ name: 'event_id', description: 'Event UUID', format: 'uuid' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['APPROVED', 'REJECTED', 'CANCELED'],
            description:
              "Required. Hành động thực hiện trên event: 'APPROVED' = áp dụng/ghi nhận là đã xử lý; 'REJECTED' = từ chối proposal; 'CANCELED' = hủy/ghi nhận bỏ qua event.",
          },
          notes: {
            type: 'string',
            nullable: true,
            description:
              'Ghi chú (tùy chọn), tối đa 240 ký tự; sẽ được lưu vào event_history.reason hoặc notes.',
            maxLength: 240,
          },
          escalate: {
            type: 'boolean',
            nullable: true,
            description:
              'Optional flag. Nếu true và action=APPROVED thì đồng thời mark escalation (tăng escalation_count). Thường không khuyến nghị dùng từ UI — dùng /escalate riêng biệt khi cần.',
          },
        },
        required: ['action'],
        example: { action: 'APPROVED', notes: 'Đã kiểm tra, xác nhận an toàn' },
      },
    }),
    ApiOkResponse({
      description: 'Trả về event đã được cập nhật (sau verify).',
      schema: {
        type: 'object',
        properties: {
          ...EventWithImagesSchema.properties,
          verification_status: {
            type: 'string',
            enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELED', 'ESCALATED', 'HANDLED'],
            description: 'Trạng thái verification canonical của event',
          },
          last_action_by: { type: 'string', format: 'uuid', nullable: true },
          last_action_at: { type: 'string', format: 'date-time', nullable: true },
          pending_since: { type: 'string', format: 'date-time', nullable: true },
          is_canceled: { type: 'boolean', nullable: true },
        },
        example: {
          event_id: '123e4567-e89b-12d3-a456-426614174000',
          user_id: '37cbad15-483d-42ff-b07d-fbf3cd1cc863',
          event_type: 'fall',
          status: 'danger',
          verification_status: 'APPROVED',
          last_action_by: '37cbad15-483d-42ff-b07d-fbf3cd1cc863',
          last_action_at: '2025-11-04T10:05:00.000Z',
          pending_since: '2025-11-04T09:00:00.000Z',
          is_canceled: false,
          detected_at: '2025-11-04T09:00:00.000Z',
          images: ['https://.../frame.jpg'],
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Yêu cầu không hợp lệ (thiếu action, action không hợp lệ, hoặc notes quá dài)',
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - token missing/invalid' }),
    ApiResponse({ status: 403, description: 'Forbidden - không có quyền thực hiện hành động này' }),
    ApiResponse({ status: 404, description: 'Not Found - event không tồn tại' }),
    ApiResponse({
      status: 409,
      description:
        'Conflict - ví dụ: đã có action tương tự vừa được áp dụng (idempotency or stale)',
    }),
  ),

  /** POST /events/:event_id/escalate */
  escalate: applyDecorators(
    ApiOperation({
      summary: 'Leo thang (escalate) một event thủ công — tăng cấp độ cảnh báo và ghi audit',
      description: `
Endpoint để thực hiện **leo thang cảnh báo** (escalation) thủ công cho một event. Leo thang có nghĩa là đánh dấu event này cần sự chú ý cấp cao hơn, thường trigger các hành động như gửi thông báo khẩn cấp, chuyển cho admin/caregiver cấp trên, hoặc kích hoạt quy trình xử lý đặc biệt.

**Khi nào sử dụng?**
- Khi event đã được verify nhưng vẫn cần can thiệp khẩn cấp (ví dụ: customer yêu cầu hỗ trợ ngay lập tức).
- Khác với auto-escalation (tự động bởi cron worker), endpoint này là manual escalation bởi user.

**Logic thực hiện:**
- Tăng \`escalation_count\` lên 1.
- Đặt \`escalated_at\` thành thời gian hiện tại.
- Thay đổi \`verification_status\` thành \`'ESCALATED'\`.
- Ghi \`auto_escalation_reason\` nếu có (từ body.reason).
- Chèn bản ghi audit vào \`event_history\` với action='ESCALATED', ghi lại actor và lý do.
- **Không** gửi thông báo tự động — đó là trách nhiệm của worker hoặc service khác (ví dụ: FCM, SMS).

**Ví dụ sử dụng:**
- Sau khi verify APPROVED, nếu customer gọi điện yêu cầu hỗ trợ, gọi escalate để mark và trigger quy trình nội bộ.

**Lưu ý:**
- Endpoint này không thay đổi status chính của event (danger/warning), chỉ mark escalation.
- Nếu event đã escalated, có thể escalate lại (count tăng).
- Permission: Yêu cầu role 'admin', 'caregiver', hoặc 'customer' (theo @Roles decorator).
      `,
    }),
    ApiParam({
      name: 'event_id',
      description: 'UUID của event cần escalate (ví dụ: 123e4567-e89b-12d3-a456-426614174000)',
      format: 'uuid',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            nullable: true,
            description:
              'Lý do leo thang (tùy chọn, tối đa 500 ký tự). Ví dụ: "Khách hàng yêu cầu hỗ trợ khẩn cấp" hoặc "Vượt ngưỡng 5 danger events trong 24h". Nếu không cung cấp, ghi "Manual escalation by user".',
            maxLength: 500,
          },
        },
        example: { reason: 'Khách hàng gọi điện yêu cầu hỗ trợ ngay lập tức' },
      },
    }),
    ApiOkResponse({
      description: 'Escalation thành công. Trả về event đã cập nhật với thông tin escalation mới.',
      schema: {
        type: 'object',
        properties: {
          ...EventWithImagesSchema.properties,
          verification_status: {
            type: 'string',
            enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELED', 'ESCALATED'],
            description: 'Sẽ là "ESCALATED" sau khi escalate.',
          },
          escalation_count: {
            type: 'number',
            description: 'Số lần event đã bị escalate (tăng lên 1).',
            example: 1,
          },
          escalated_at: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian escalate cuối cùng.',
            example: '2025-11-04T10:00:00.000Z',
          },
          auto_escalation_reason: {
            type: 'string',
            nullable: true,
            description: 'Lý do escalation (từ body.reason).',
            example: 'Khách hàng yêu cầu hỗ trợ khẩn cấp',
          },
          last_action_by: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'UUID của user thực hiện escalate.',
          },
          last_action_at: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian thực hiện action.',
          },
        },
        example: {
          event_id: '123e4567-e89b-12d3-a456-426614174000',
          user_id: '37cbad15-483d-42ff-b07d-fbf3cd1cc863',
          event_type: 'fall',
          status: 'danger',
          verification_status: 'ESCALATED',
          escalation_count: 1,
          escalated_at: '2025-11-04T10:00:00.000Z',
          auto_escalation_reason: 'Khách hàng yêu cầu hỗ trợ khẩn cấp',
          last_action_by: '37cbad15-483d-42ff-b07d-fbf3cd1cc863',
          last_action_at: '2025-11-04T10:00:00.000Z',
          detected_at: '2025-11-04T09:00:00.000Z',
          images: ['https://.../frame.jpg'],
        },
      },
    }),
    ApiResponse({
      status: 400,
      description:
        'Yêu cầu không hợp lệ (event_id không tồn tại, reason quá dài, hoặc event đã canceled).',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'Event not found or already canceled' },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiResponse({
      status: 403,
      description:
        'Không có quyền thực hiện escalation (role không đủ hoặc event không thuộc customer của user).',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 403 },
          message: { type: 'string', example: 'Forbidden resource' },
          error: { type: 'string', example: 'Forbidden' },
        },
      },
    }),
    ApiResponse({
      status: 500,
      description: 'Lỗi server (DB error, transaction fail).',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 500 },
          message: { type: 'string', example: 'Internal server error' },
          error: { type: 'string', example: 'Internal Server Error' },
        },
      },
    }),
  ),
};
