import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { UpdateTicketDto } from '../application/dto/tickets/update-ticket.dto';
export const TicketsSwagger = {
  list: applyDecorators(
    ApiOperation({
      summary: 'Lấy danh sách tickets',
      description:
        '- Admin: hỗ trợ phân trang với ?page & ?page_size, xem tất cả tickets\n' +
        '- Customer/Caregiver: chỉ xem tickets của chính mình',
    }),
    ApiOkResponse({
      description: 'Array of tickets',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ticket_id: {
              type: 'string',
              format: 'uuid',
              example: 'uuid-ticket-1',
              description: 'Unique ticket identifier',
            },
            user_id: {
              type: 'string',
              format: 'uuid',
              example: 'uuid-user-1',
              description: 'Owner user id',
            },
            category: {
              type: 'string',
              example: 'technical',
              description: 'Ticket category',
            },

            status: {
              type: 'string',
              example: 'new',
              description: 'Current status of the ticket',
            },
            assigned_to: {
              type: 'string',
              example: 'uuid-agent-1',
              description: 'Assigned agent id',
              nullable: true,
            },
            title: {
              type: 'string',
              example: 'Cannot login',
              description: 'Short title',
              nullable: true,
            },
            description: {
              type: 'string',
              example: 'I get an error...',
              description: 'Detailed description',
              nullable: true,
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              example: ['login', 'urgent'],
              description: 'Tags',
              nullable: true,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2025-10-17T12:00:00.000Z',
              description: 'Creation timestamp',
            },
          },
        },
      },
    }),
  ),

  findById: applyDecorators(
    ApiOperation({ summary: 'Lấy chi tiết support_tickets theo ID' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiOkResponse({
      description: 'Ticket object',
      schema: {
        type: 'object',
        properties: {
          ticket_id: {
            type: 'string',
            format: 'uuid',
            example: 'uuid-ticket-1',
            description: 'Unique ticket identifier',
          },
          user_id: {
            type: 'string',
            format: 'uuid',
            example: 'uuid-user-1',
            description: 'Owner user id',
          },
          category: {
            type: 'string',
            example: 'technical',
            description: 'Ticket category',
          },

          status: {
            type: 'string',
            example: 'new',
            description: 'Current status of the ticket',
          },
          assigned_to: {
            type: 'string',
            example: 'uuid-agent-1',
            description: 'Assigned agent id',
            nullable: true,
          },
          title: {
            type: 'string',
            example: 'Cannot login',
            description: 'Short title',
            nullable: true,
          },
          description: {
            type: 'string',
            example: 'I get an error...',
            description: 'Detailed description',
            nullable: true,
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            example: ['login', 'urgent'],
            description: 'Tags',
            nullable: true,
          },
          metadata: {
            type: 'object',
            example: { browser: 'chrome' },
            description: 'Metadata',
            nullable: true,
          },

          resolved_at: {
            type: 'string',
            format: 'date-time',
            example: null,
            description: 'Resolved timestamp',
            nullable: true,
          },
          closed_at: {
            type: 'string',
            format: 'date-time',
            example: null,
            description: 'Closed timestamp',
            nullable: true,
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            example: '2025-10-17T12:00:00.000Z',
            description: 'Creation timestamp',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            example: '2025-10-17T12:05:00.000Z',
            description: 'Last update timestamp',
          },
        },
      },
    }),
  ),

  create: applyDecorators(
    ApiOperation({
      summary: 'Tạo mới support_tickets',
      description: `Tạo mới một ticket hỗ trợ (kĩ thuật / billing / general).

  Mục đích và hướng dẫn trường (field-level):

  - user_id (UUID): định danh người sở hữu ticket. Nếu caller không phải admin, server sẽ tự động ghi đè bằng user id trong token để đảm bảo khách hàng chỉ tạo ticket cho chính họ. Frontend thường không cần truyền trường này khi user tạo cho chính mình.

  - category (string): phân loại ticket (ví dụ: 'technical', 'billing', 'general'). Dùng để định tuyến tới đội phù hợp. FE nên lấy danh sách giá trị hợp lệ từ endpoint metadata.

  - title (string): tiêu đề ngắn gọn của ticket. Khuyến nghị <= 120 ký tự.

  - description (string): mô tả chi tiết của vấn đề, bao gồm các bước tái hiện, kết quả mong đợi, và bất kỳ thông tin môi trường hữu ích (app_version, device, os, browser).

  - attachments (array, tuỳ chọn): danh sách tham chiếu tới file đã upload trước. Flow khuyến nghị:
    1) FE upload file qua POST /credential_images (multipart/form-data) -> server trả {id, url}.
    2) FE dùng id trả về (attachments[].file_id) khi gọi POST /api/tickets.

    Chi tiết từng trường trong attachments[]:
    - file_id (UUID, bắt buộc): ID của file trong bảng uploads (credential_images). Backend sẽ verify file tồn tại và thuộc về caller (trừ admin), sau đó ánh xạ file_id -> canonical file_url trước khi lưu. Nếu file không tồn tại hoặc không thuộc về user, server trả lỗi.
    - file_name (string, tuỳ chọn): tên file gốc để hiển thị. Backend ưu tiên filename trong bản ghi uploads.
    - file_url (string, tuỳ chọn): URL preview; backend sẽ thay bằng URL canonical từ record uploads để tránh spoofing.
    - file_size (number, tuỳ chọn): kích thước bytes. Server có giới hạn (ví dụ 10MB); file vượt giới hạn có thể bị từ chối.
    - mime_type (string, tuỳ chọn): MIME của file. Hệ thống chấp nhận các loại phổ biến (image/png, image/jpeg, application/pdf, text/plain); loại khác có thể bị chặn.
    - description (string, tuỳ chọn): mô tả ngắn giúp agent hiểu bối cảnh file.

  Required parameters (bắt buộc):
  - description (string): mô tả chi tiết vấn đề. (required)

  Optional parameters (tuỳ chọn):
  - user_id (UUID): định danh người sở hữu ticket. Trong hầu hết trường hợp frontend có thể bỏ qua và server sẽ set owner từ token (trừ khi caller là admin). (optional)
  - category (string): phân loại ticket. (optional)
  
  - title (string): tiêu đề ngắn gọn, giúp UI hiển thị nhanh. (optional)
  - tags (string[]): các tag ngắn giúp phân loại/tìm kiếm. (optional)
  - attachments (array): mảng các tham chiếu file đã upload (attachment.file_id). (optional)
  - metadata (object): thông tin môi trường phục vụ debug (optional)

  (Ghi chú: 'user_id' có thể được bỏ qua bởi frontend khi người dùng tạo ticket cho chính họ; server sẽ override 'user_id' bằng id trong token trừ khi caller là admin.)
  - metadata (object, tuỳ chọn): thông tin môi trường phục vụ debug (app_version, device, os, browser, steps_to_reproduce). KHÔNG gửi PII hoặc dữ liệu nhạy cảm ở đây.

  Quyền & hành vi server:
  - Customer: chỉ được tạo ticket cho chính mình (server sẽ override user_id từ token).
  - Admin: có thể tạo ticket thay mặt user (được phép cung cấp user_id khác).
  - Khi attachments được gửi, backend sẽ verify và ánh xạ trước khi lưu; các tham chiếu file sẽ được lưu vào 'metadata.attachments' dưới dạng canonical object (file_id, file_name, file_url, file_size, mime_type, description).

  Ví dụ flow ngắn: FE -> POST /credential_images (file) -> nhận {id,url} -> POST /api/tickets với attachments.[].file_id = id.`,
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            format: 'uuid',
            example: 'uuid-user-1',
            description:
              'UUID của user chủ sở hữu ticket. Nếu caller không phải admin, server sẽ ghi đè trường này bằng user id lấy từ token. Frontend có thể bỏ qua trường này để server tự set owner. Admin có thể chỉ định user_id khác khi cần tạo ticket thay mặt user. (optional)',
          },
          category: {
            type: 'string',
            example: 'technical',
            description:
              'Phân loại ticket (ví dụ: technical, billing, general). Giá trị này giúp định tuyến tới đội xử lý phù hợp. FE nên lấy danh sách hợp lệ từ endpoint metadata (TicketsSwagger.meta). (optional)',
            nullable: true,
          },
          description: {
            type: 'string',
            example: 'Khi tôi cố gắng đăng nhập, hệ thống báo lỗi 500 và không cho tiếp tục...',
            description:
              'Mô tả chi tiết: nêu rõ bước tái hiện (bước 1, bước 2...), hành vi mong đợi vs thực tế, log hoặc thông tin môi trường (app_version, device). Có thể đính kèm ảnh hoặc file log trong `attachments` để hỗ trợ chẩn đoán. (required)',
            nullable: true,
          },

          attachments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                file_id: {
                  type: 'string',
                  format: 'uuid',
                  example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                  description:
                    'ID của file trong bảng uploads (credential_images). Đây là trường bắt buộc khi FE muốn đính kèm file đã upload trước. Backend sẽ verify file_id tồn tại và thuộc về caller (trừ admin), sau đó ánh xạ URL canonical trước khi lưu vào ticket. Nếu file không tồn tại hoặc không thuộc về user sẽ trả lỗi.',
                },
                file_name: {
                  type: 'string',
                  example: 'photo.png',
                  description:
                    'Tên file gốc để hiển thị trong UI. Field này là tuỳ chọn; backend sẽ ưu tiên dùng filename đã lưu trong bảng uploads nếu có.',
                },
                file_url: {
                  type: 'string',
                  example: 'https://res.cloudinary.com/.../photo.png',
                  description:
                    'URL công khai tới file. FE có thể gửi để preview nhanh; tuy nhiên backend sẽ xác thực file_id và thay bằng URL canonical (từ uploads record) khi lưu để tránh spoofing.',
                },
                file_size: {
                  type: 'number',
                  example: 204800,
                  description:
                    'Kích thước file tính bằng bytes. Hệ thống khuyến nghị giới hạn mỗi file <= 10MB; server có thể từ chối nếu vượt quá giới hạn theo policy.',
                },
                mime_type: {
                  type: 'string',
                  example: 'image/png',
                  description:
                    'MIME type của file. Hệ thống chấp nhận các loại phổ biến (image/png, image/jpeg, application/pdf, text/plain); các loại không nằm trong whitelist có thể bị chặn.',
                },
                description: {
                  type: 'string',
                  example: 'Ảnh lỗi hiển thị',
                  nullable: true,
                  description:
                    "Mô tả ngắn về file (tuỳ chọn) — ví dụ: 'Ảnh chụp màn hình hiển thị lỗi'. Dùng để giúp agent hiểu bối cảnh file.",
                },
              },
            },
            description: `Danh sách tham chiếu tới file đã upload trước đó. Flow khuyến nghị: FE gọi POST /credential_images (multipart/form-data) -> nhận {id,url} -> truyền attachments[].file_id = id vào payload tạo ticket. Backend sẽ:

- Verify file_id tồn tại.
- Kiểm tra quyền sở hữu (upload.user_id === caller.userId) — trừ admin.
- Map file_id -> canonical file_url (từ uploads record) để tránh spoofing.
- Lưu thông tin đính kèm vào ticket dưới \`metadata.attachments\` (không lưu bản sao file), bao gồm file_id, file_name, file_url, file_size, mime_type, description.

Lưu ý bảo mật: không gửi PII trong file hoặc metadata; các file ngoài whitelist có thể bị từ chối. (optional)`,
            nullable: true,
          },

          metadata: {
            type: 'object',
            example: { device: 'iOS', app_version: '1.2.3', os: 'iOS 18.0' },
            description:
              'Trường tuỳ chọn để gửi thông tin môi trường phục vụ debug (ví dụ: device, app_version, os, browser). Tránh gửi PII hoặc dữ liệu nhạy cảm trong metadata.',
            nullable: true,
          },
        },
        required: ['description'],
        example: {
          user_id: 'uuid-user-1',
          category: 'technical',
          description: 'Description of request',
          attachments: [
            {
              file_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
              file_name: 'screenshot.png',
              file_url: 'https://res.cloudinary.com/.../screenshot.png',
              file_size: 204800,
              mime_type: 'image/png',
              description: 'Screenshot showing the error',
            },
          ],
        },
      },
    }),
    ApiCreatedResponse({
      description: 'Ticket created successfully',
      schema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Ticket created successfully',
            description: 'Result message',
          },
          ticket_id: {
            type: 'string',
            format: 'uuid',
            example: 'uuid-ticket-1',
            description: 'Created ticket id',
          },
        },
      },
    }),
  ),

  update: applyDecorators(
    ApiOperation({ summary: 'Cập nhật support_tickets theo ID' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiBody({ type: UpdateTicketDto }),
    ApiOkResponse({
      description: 'Ticket updated successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Ticket updated successfully' },
        },
      },
    }),
  ),

  remove: applyDecorators(
    ApiOperation({
      summary: 'Xóa ticket (chỉ admin)',
      description:
        'Xóa vĩnh viễn một ticket hỗ trợ theo UUID. Chỉ admin được phép thực hiện thao tác này. Hành động này sẽ xoá dữ liệu ticket khỏi hệ thống và không thể khôi phục.',
    }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiOkResponse({
      description: 'Ticket deleted successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Ticket deleted successfully' },
        },
      },
    }),
  ),

  history: applyDecorators(
    ApiOperation({
      summary: 'Lấy lịch sử ticket — mặc định trả về mỗi entry đã được mở rộng (per-field diffs)',
      description:
        'Endpoint trả về các bản ghi lịch sử (activity) của ticket. Mỗi bản ghi được mở rộng (expanded) để kèm `change_count` và `changes` — một mảng các diff trên từng trường (field-level diffs).\n\n' +
        'Query parameter `expand_limit` (integer) giới hạn số mục `changes` trả về cho mỗi bản ghi (mặc định 20, tối đa 100). Nếu không gửi `expand_limit`, server sẽ trả tối đa 20 mục per entry. Nếu gửi giá trị không hợp lệ (<=0 hoặc không phải integer) server trả 400.\n\n' +
        'Lưu ý tương thích: trước đây có thể có dạng dữ liệu khác (legacy flattened/split). Client cũ cần cập nhật để tiêu thụ `changes` array; nếu cần trả raw rows có thể yêu cầu thay đổi API sau này.',
    }),
    ApiParam({ name: 'ticketId', type: 'string', format: 'uuid' }),
    ApiQuery({
      name: 'expand_limit',
      required: false,
      example: 20,
      schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
      description:
        'Số phần tử trong `changes` trả về cho mỗi history entry. Default 20, Max 100. Giá trị >100 sẽ được clamp về 100; giá trị <=0 hoặc không phải integer → 400.',
    }),
    ApiOkResponse({
      description: 'Array of ticket history entries (expanded).',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            history_id: { type: 'string', format: 'uuid' },
            ticket_id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid', nullable: true },
            action: { type: 'string', example: 'updated' },
            description: { type: 'string', nullable: true },
            old_values: { type: 'object', nullable: true },
            new_values: { type: 'object', nullable: true },
            metadata: { type: 'object', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            // Augmented fields provided by server when expanded
            change_count: { type: 'number', example: 2 },
            changes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', description: 'Top-level field name that changed' },
                  path: {
                    type: 'string',
                    description:
                      "Dot-separated path from root object (ví dụ: 'title' hoặc 'metadata.browser')",
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
      examples: {
        expanded: {
          summary: 'Example expanded history entry',
          value: [
            {
              history_id: 'h1',
              ticket_id: 't1',
              user_id: 'u1',
              action: 'updated',
              old_values: { title: 'A', priority: 'medium' },
              new_values: { title: 'B', priority: 'high' },
              description: 'Ticket updated',
              created_at: '2025-10-21T09:00:00.000Z',
              change_count: 2,
              changes: [
                { field: 'title', path: 'title', old: 'A', new: 'B' },
                { field: 'priority', path: 'priority', old: 'medium', new: 'high' },
              ],
            },
          ],
        },
      },
    }),
  ),

  updateStatus: applyDecorators(
    ApiOperation({
      summary: 'Cập nhật trạng thái support_tickets',
      description: `  Quy tắc thay đổi trạng thái:

  - Admin / Caregiver: có quyền thay đổi mọi trạng thái.
  - Customer: chỉ được thay đổi khi ticket đang ở trạng thái 'waiting_for_customer' hoặc khi ticket mới ('new').
    Trong những trường hợp này khách hàng chỉ được chuyển sang các trạng thái cho phép (ví dụ 'in_progress' khi khách hàng phản hồi để agent tiếp tục xử lý, hoặc 'closed' nếu khách hàng xác nhận vấn đề đã được giải quyết).

  Các trạng thái hợp lệ và ý nghĩa (frontend nên hiển thị cho user):
  - new: ticket mới vừa được tạo (chưa được xử lý)
  - open: ticket được chấp nhận và đang chờ xử lý
  - in_progress: agent đang xử lý ticket
  - waiting_for_customer: đang chờ phản hồi từ khách hàng
  - waiting_for_agent: đang chờ hành động từ đội hỗ trợ/agent khác
  - resolved: vấn đề đã được giải quyết (chờ đóng)
  - closed: ticket đã đóng/hoàn tất

  Lưu ý về chuyển trạng thái: frontend có thể tham khảo bảng transitions (TicketsSwagger.meta) để biết các chuyển đổi hợp lệ giữa các trạng thái.`,
    }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description:
              'Trạng thái mới của ticket. Giá trị hợp lệ: new, open, in_progress, waiting_for_customer, waiting_for_agent, resolved, closed',
            enum: [
              'new',
              'open',
              'in_progress',
              'waiting_for_customer',
              'waiting_for_agent',
              'resolved',
              'closed',
            ],
          },
        },
        required: ['status'],
        example: { status: 'in_progress' },
      },
    }),
    ApiOkResponse({
      description: 'Ticket status updated successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Ticket status updated successfully' },
        },
      },
    }),
  ),
  meta: applyDecorators(
    ApiOperation({
      summary: 'Ticket metadata for frontend (statuses, priorities, categories, transitions)',
    }),
    ApiOkResponse({
      description: 'Metadata object',
      schema: {
        type: 'object',
        properties: {
          statuses: {
            type: 'array',
            items: { type: 'string' },
          },
          categories: {
            type: 'array',
            items: { type: 'string' },
          },
          transitions: {
            type: 'object',
            additionalProperties: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    }),
  ),
};
