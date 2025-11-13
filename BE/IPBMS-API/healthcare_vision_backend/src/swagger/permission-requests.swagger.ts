import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiBody, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import {
  CreatePermissionRequestDto,
  ApprovePermissionRequestDto,
  RejectPermissionRequestDto,
  BulkDecisionDto,
  PermissionRequestType,
  PermissionRequestStatus,
} from '../application/dto/shared-permissions/permission-request.dto';

export class PermissionRequestsSwagger {
  static create = applyDecorators(
    ApiOperation({ summary: 'Caregiver gửi yêu cầu quyền truy cập' }),
    ApiBody({
      type: CreatePermissionRequestDto,
      examples: {
        stream_view: {
          summary: 'Yêu cầu quyền xem camera',
          value: {
            customerId: 'uuid-cus',
            caregiverId: 'uuid-care',
            type: 'stream_view',
            requested_bool: true,
            scope: 'read',
            reason: 'Cần theo dõi camera ban đêm',
          },
        },
        log_access_days: {
          summary: 'Yêu cầu quyền xem log 7 ngày',
          value: {
            customerId: 'uuid-cus',
            caregiverId: 'uuid-care',
            type: 'log_access_days',
            requested_days: 7,
            reason: 'Cần xem lịch sử 7 ngày',
          },
        },
        notification_channel: {
          summary: 'Yêu cầu thay đổi kênh thông báo',
          value: {
            customerId: 'uuid-cus',
            caregiverId: 'uuid-care',
            type: 'notification_channel',
            requested_channels: ['push', 'sms'],
            reason: 'Muốn nhận thông báo qua SMS',
          },
        },
      },
    }),
  );

  static listPending = applyDecorators(
    ApiOperation({ summary: 'Customer xem danh sách các yêu cầu đang chờ duyệt (PENDING)' }),
    ApiParam({
      name: 'customerId',
      type: 'string',
      required: true,
      description: 'UUID của Customer',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      example: 'PENDING',
      description: 'Trạng thái cần lọc (mặc định: PENDING)',
    }),
    ApiResponse({
      status: 200,
      description: 'Danh sách yêu cầu đang chờ duyệt',
      schema: {
        type: 'array',
        items: {
          example: {
            id: 'uuid-request',
            type: 'stream_view',
            status: 'PENDING',
            caregiver_id: 'uuid-caregiver',
            reason: 'Cần xem camera ca trực',
          },
        },
      },
    }),
  );

  static approve = applyDecorators(
    ApiOperation({ summary: 'Customer duyệt yêu cầu quyền truy cập' }),
    ApiParam({
      name: 'id',
      type: 'string',
      required: true,
      description: 'UUID của request cần duyệt',
    }),
    ApiBody({
      type: ApprovePermissionRequestDto,
      examples: {
        default: {
          summary: 'Ví dụ duyệt yêu cầu',
          value: {
            decisionReason: 'Đồng ý cấp quyền xem camera',
            override: true,
            mode: 'replace',
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Duyệt yêu cầu thành công và cập nhật shared_permissions.',
    }),
    ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu quyền' }),
    ApiResponse({ status: 403, description: 'Không có quyền duyệt yêu cầu này' }),
  );

  static reject = applyDecorators(
    ApiOperation({ summary: 'Customer từ chối yêu cầu quyền truy cập' }),
    ApiParam({
      name: 'id',
      type: 'string',
      required: true,
      description: 'UUID của request cần từ chối',
    }),
    ApiBody({
      type: RejectPermissionRequestDto,
      examples: {
        default: {
          summary: 'Ví dụ từ chối yêu cầu',
          value: {
            decisionReason: 'Không cần thiết với vai trò của caregiver',
          },
        },
      },
    }),
    ApiResponse({ status: 200, description: 'Từ chối yêu cầu thành công.' }),
    ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu quyền' }),
  );

  static bulkApprove = applyDecorators(
    ApiOperation({ summary: 'Customer duyệt hàng loạt các yêu cầu quyền truy cập' }),
    ApiBody({
      type: BulkDecisionDto,
      examples: {
        default: {
          summary: 'Ví dụ duyệt nhiều yêu cầu',
          value: {
            ids: ['uuid-request-1', 'uuid-request-2'],
            decisionReason: 'Cấp quyền hàng loạt cho caregiver',
            override: true,
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Duyệt hàng loạt thành công',
      schema: {
        example: {
          updated: 2,
          results: [
            {
              id: 'uuid-request-1',
              success: true,
              result: { id: 'uuid-request-1', status: 'APPROVED' },
            },
            {
              id: 'uuid-request-2',
              success: true,
              result: { id: 'uuid-request-2', status: 'APPROVED' },
            },
          ],
        },
      },
    }),
  );

  static bulkReject = applyDecorators(
    ApiOperation({ summary: 'Customer từ chối hàng loạt các yêu cầu quyền truy cập' }),
    ApiBody({
      type: BulkDecisionDto,
      examples: {
        default: {
          summary: 'Ví dụ từ chối nhiều yêu cầu',
          value: {
            ids: ['uuid-request-3', 'uuid-request-4'],
            decisionReason: 'Không cần thiết',
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Từ chối hàng loạt thành công',
      schema: {
        example: {
          updated: 1,
          results: [
            {
              id: 'uuid-request-3',
              success: true,
              result: { id: 'uuid-request-3', status: 'REJECTED' },
            },
            { id: 'uuid-request-4', success: false, error: 'Request not found' },
          ],
        },
      },
    }),
  );
  static listApproved = applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách các yêu cầu đã được customer duyệt' }),
    ApiParam({ name: 'customerId', type: 'string', required: true }),
    ApiResponse({ status: 200, description: 'Danh sách các request đã được duyệt (APPROVED)' }),
  );

  static listRejected = applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách các yêu cầu đã bị customer từ chối' }),
    ApiParam({ name: 'customerId', type: 'string', required: true }),
    ApiResponse({ status: 200, description: 'Danh sách các request bị từ chối (REJECTED)' }),
  );
  /** C: Detail + history */
  static detail = applyDecorators(
    ApiOperation({ summary: 'Xem chi tiết một permission request (kèm history)' }),
    ApiParam({ name: 'id', required: true, description: 'UUID của permission request' }),
    ApiQuery({
      name: 'expand_limit',
      required: false,
      schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
      description:
        'Số phần tử trong `changes` trả về cho mỗi history entry. Default 20, Max 100. Giá trị >100 sẽ được clamp về 100; giá trị <=0 hoặc không phải integer → 400.',
    }),
    ApiResponse({
      status: 200,
      description:
        'Chi tiết request. Nếu request có lịch sử thay đổi (history), phần `history` sẽ được mở rộng để kèm `change_count` và `changes` — mảng diff theo từng trường (field-level diffs). `expand_limit` query param giới hạn số phần tử `changes` trả về cho mỗi history entry.',
      schema: {
        example: {
          request: {
            id: 'uuid-request',
            type: 'stream_view',
            status: 'PENDING',
            caregiver_id: 'uuid-caregiver',
            reason: 'Cần xem camera ca trực',
          },
          history: [
            {
              history_id: 'h1',
              action: 'updated',
              created_at: '2025-09-10T12:00:00Z',
              actor_id: 'uuid-user',
              actor_name: 'Nguyen Van A',
              change_count: 1,
              changes: [
                { field: 'reason', path: 'reason', old: 'initial', new: 'Cần xem camera ca trực' },
              ],
            },
          ],
        },
      },
    }),
    ApiResponse({ status: 403, description: 'Forbidden' }),
    ApiResponse({ status: 404, description: 'Request not found' }),
  );

  /** D: Reopen */
  static reopen = applyDecorators(
    ApiOperation({ summary: 'Mở lại một permission request (đưa về PENDING)' }),
    ApiParam({ name: 'id', required: true, description: 'UUID của permission request' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: { reason: { type: 'string', example: 'Bổ sung thông tin' } },
      },
    }),
    ApiResponse({ status: 200, description: 'Reopen thành công' }),
    ApiResponse({ status: 400, description: 'Cannot reopen this request' }),
    ApiResponse({ status: 403, description: 'Forbidden' }),
    ApiResponse({ status: 404, description: 'Request not found' }),
  );

  /** A: ALL */
  static listAll = applyDecorators(
    ApiOperation({ summary: 'Lấy tất cả permission requests của customer' }),
    ApiParam({ name: 'customerId', required: true, description: 'UUID của Customer' }),
    ApiResponse({ status: 200, description: 'Danh sách tất cả request của customer' }),
  );

  /** B: DECIDED */
  static listDecided = applyDecorators(
    ApiOperation({ summary: 'Lấy các permission requests đã được xử lý của customer' }),
    ApiParam({ name: 'customerId', required: true, description: 'UUID của Customer' }),
    ApiResponse({ status: 200, description: 'Danh sách các request đã xử lý' }),
  );
}
