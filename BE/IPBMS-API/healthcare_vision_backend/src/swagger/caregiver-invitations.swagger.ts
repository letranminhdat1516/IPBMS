import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import {
  AssignmentResponseDto,
  AssignmentWithCaregiverDto,
  CreateAssignmentDto,
} from '../application/dto/caregiver-invitations/assignment.dto';

export const CaregiverInvitationsSwagger = {
  list: applyDecorators(
    ApiOperation({ summary: 'Liệt kê các assignment đang active (filter tùy chọn)' }),
    ApiQuery({ name: 'caregiver_id', required: false, description: 'Lọc theo caregiver' }),
    ApiQuery({ name: 'customer_id', required: false, description: 'Lọc theo customer' }),
    ApiOkResponse({
      type: AssignmentResponseDto,
      isArray: true,
      schema: {
        example: [
          {
            assignment_id: 'a1',
            caregiver_id: 'cg-1',
            customer_id: 'cust-1',
            assigned_at: new Date().toISOString(),
            is_active: true,
            status: 'pending',
            assignment_notes: 'Giúp mẹ trông bệnh',
            assigned_by_info: { user_id: 'admin-1', username: 'admin', full_name: 'Admin User' },
            response_reason: null,
          },
        ],
      },
    }),
  ),

  create: applyDecorators(
    ApiOperation({
      summary: 'Tạo assignment mới (chờ caregiver chấp nhận)',
      description:
        '- Không cho phép nếu caregiver đã được khách hàng khác chấp nhận\n' +
        '- Không cho phép nếu caregiver đã chấp nhận chính khách hàng này\n' +
        '- Không cho phép nếu caregiver đang ở trạng thái pending\n' +
        '- Cho phép nếu caregiver từng bị từ chối (rejected)',
    }),
    ApiBody({ type: CreateAssignmentDto }),
    ApiCreatedResponse({
      description: 'Assignment được tạo ở trạng thái pending',
      type: AssignmentResponseDto,
      schema: {
        example: {
          assignment_id: 'a1',
          caregiver_id: 'cg-1',
          customer_id: 'cust-1',
          assigned_at: new Date().toISOString(),
          is_active: true,
          status: 'pending',
          assignment_notes: 'Ghi chú',
          assigned_by_info: { user_id: 'admin-1', username: 'admin', full_name: 'Admin User' },
          response_reason: null,
        },
      },
    }),
  ),

  unassignById: applyDecorators(
    ApiOperation({
      summary: 'Huỷ assignment',
      description:
        '- Cho phép huỷ bất kỳ trạng thái nào (pending, accepted, rejected)\n' +
        '- Chỉ caregiver hoặc customer của assignment mới có quyền huỷ',
    }),
    ApiOkResponse({
      description: 'Assignment đã được huỷ thành công',
      type: AssignmentResponseDto,
      schema: {
        example: {
          assignment_id: 'a1',
          caregiver_id: 'cg-1',
          customer_id: 'cust-1',
          assigned_at: new Date().toISOString(),
          unassigned_at: new Date().toISOString(),
          is_active: false,
          status: 'rejected',
          assignment_notes: 'Ghi chú',
          assigned_by_info: { user_id: 'admin-1', username: 'admin', full_name: 'Admin User' },
          response_reason: 'Không thể chăm sóc vào giờ này',
        },
      },
    }),
  ),

  getPending: applyDecorators(
    ApiOperation({ summary: 'Caregiver xem các assignment đang pending' }),
    ApiOkResponse({
      type: AssignmentResponseDto,
      isArray: true,
      schema: {
        example: [
          {
            assignment_id: 'a2',
            caregiver_id: 'cg-2',
            customer_id: 'cust-2',
            assigned_at: new Date().toISOString(),
            is_active: true,
            status: 'pending',
            assignment_notes: null,
            assigned_by_info: null,
            response_reason: null,
          },
        ],
      },
    }),
  ),

  accept: applyDecorators(
    ApiOperation({ summary: 'Caregiver chấp nhận lời mời (accept assignment)' }),
    ApiOkResponse({
      description: 'Assignment đã được chấp nhận',
      type: AssignmentResponseDto,
      schema: {
        example: {
          assignment_id: 'a1',
          caregiver_id: 'cg-1',
          customer_id: 'cust-1',
          assigned_at: new Date().toISOString(),
          is_active: true,
          status: 'accepted',
          assignment_notes: null,
          assigned_by_info: { user_id: 'admin-1', username: 'admin', full_name: 'Admin User' },
          response_reason: null,
        },
      },
    }),
  ),

  reject: applyDecorators(
    ApiOperation({ summary: 'Caregiver từ chối assignment' }),
    ApiOkResponse({
      description: 'Assignment đã bị từ chối',
      type: AssignmentResponseDto,
      schema: {
        example: {
          assignment_id: 'a1',
          caregiver_id: 'cg-1',
          customer_id: 'cust-1',
          assigned_at: new Date().toISOString(),
          is_active: false,
          status: 'rejected',
          assignment_notes: 'Ghi chú',
          assigned_by_info: { user_id: 'admin-1', username: 'admin', full_name: 'Admin User' },
          response_reason: 'Bận vào ngày này',
          responded_at: new Date().toISOString(),
        },
      },
    }),
  ),

  getAssignmentsOfCaregiver: applyDecorators(
    ApiOperation({ summary: 'Caregiver xem danh sách customer đã assign mình' }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: ['pending', 'accepted', 'rejected'],
      description: 'Lọc theo trạng thái assignment (tùy chọn)',
    }),
    ApiOkResponse({
      type: AssignmentResponseDto,
      isArray: true,
      schema: {
        example: [
          {
            assignment_id: 'a1',
            caregiver_id: 'cg-1',
            customer_id: 'cust-1',
            assigned_at: new Date().toISOString(),
            is_active: true,
            status: 'accepted',
            assignment_notes: null,
            assigned_by_info: { user_id: 'admin-1', username: 'admin', full_name: 'Admin User' },
            response_reason: null,
          },
        ],
      },
    }),
  ),

  getAssignmentsOfCustomer: applyDecorators(
    ApiOperation({ summary: 'Customer xem danh sách caregiver đã được mình assign' }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: ['pending', 'accepted', 'rejected'],
      description: 'Lọc theo trạng thái assignment (tùy chọn)',
    }),
    ApiOkResponse({
      type: AssignmentResponseDto,
      isArray: true,
      schema: {
        example: [
          {
            assignment_id: 'a1',
            caregiver_id: 'cg-1',
            customer_id: 'cust-1',
            assigned_at: new Date().toISOString(),
            is_active: true,
            status: 'accepted',
            assignment_notes: null,
            assigned_by_info: { user_id: 'admin-1', username: 'admin', full_name: 'Admin User' },
            response_reason: null,
          },
        ],
      },
    }),
  ),

  getAssignmentsByCustomerId: applyDecorators(
    ApiOperation({
      summary:
        'Xem danh sách caregiver đã được assign cho customer cụ thể (dùng cho admin/caregiver)',
      description:
        'Trả về các caregiver đang được assign cho customer thông qua `customer_id`.\n' +
        'Chỉ trả về các assignment active. Nếu muốn xem cả đã huỷ, cần dùng API riêng.',
    }),
    ApiOkResponse({ type: AssignmentWithCaregiverDto, isArray: true }),
  ),

  stats: applyDecorators(
    ApiOperation({ summary: 'Lấy thống kê assignments' }),
    ApiQuery({ name: 'user_id', required: false, description: 'Lọc theo user ID (tùy chọn)' }),
    ApiOkResponse({
      description: 'Thống kê assignments',
      schema: {
        example: {
          total_assignments: 25,
          pending_assignments: 5,
          accepted_assignments: 18,
          rejected_assignments: 2,
          active_assignments: 18,
        },
      },
    }),
  ),

  unassignByPair: applyDecorators(
    ApiOperation({
      summary: 'Huỷ assignment theo cặp caregiver-customer',
      description:
        '- Cho phép huỷ assignment active giữa caregiver và customer\n' +
        '- Chỉ caregiver hoặc customer của assignment mới có quyền huỷ\n' +
        '- Sử dụng body chứa caregiver_id và customer_id',
    }),
    ApiBody({
      description: 'Thông tin cặp caregiver-customer cần huỷ assignment',
      schema: {
        type: 'object',
        properties: {
          caregiver_id: {
            type: 'string',
            format: 'uuid',
            description: 'ID của caregiver',
          },
          customer_id: {
            type: 'string',
            format: 'uuid',
            description: 'ID của customer',
          },
        },
        required: ['caregiver_id', 'customer_id'],
      },
    }),
    ApiOkResponse({
      description: 'Assignment đã được huỷ thành công',
      schema: {
        example: {
          message: 'Đã xoá assignment thành công',
        },
      },
    }),
  ),
};
