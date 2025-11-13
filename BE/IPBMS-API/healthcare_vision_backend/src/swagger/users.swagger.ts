import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CreateUserDto } from '../application/dto/user/create-user.dto';
import { UserDto } from '../application/dto/user/user.dto';
import { SwaggerEndpoint } from '../shared/decorators/swagger.decorator';

export const UsersSwagger = {
  // CREATE
  create: applyDecorators(
    SwaggerEndpoint({
      tags: ['users'],
      summary: 'Tạo user mới',
      responses: [
        { status: 201, description: 'Tạo thành công', type: UserDto },
        { status: 400, description: 'Dữ liệu không hợp lệ' },
      ],
    }),
    ApiBody({
      type: CreateUserDto,
      examples: {
        default: {
          value: {
            username: 'user',
            email: 'user@email.com',
            phone_number: '0123456789',
            full_name: 'Nguyen Van A',
          },
        },
      },
    }),
  ),

  // GET MANY (list + paginate + filters)
  getAll: applyDecorators(
    SwaggerEndpoint({
      tags: ['users'],
      summary: 'Lấy danh sách user',
      responses: [
        {
          status: 200,
          description: 'Danh sách user',
          type: UserDto,
          isArray: true,
        },
      ],
    }),
    ApiQuery({
      name: 'include',
      required: false,
      description:
        'Các field phụ kèm theo (luôn bao gồm thông tin plans, camera quota, alerts, payments)',
      example: 'summary',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      description: "Lọc theo trạng thái ('active' | 'inactive')",
      schema: { enum: ['active', 'inactive'] },
    }),
    ApiQuery({
      name: 'role',
      required: false,
      description: "Lọc theo role ('admin' | 'caregiver' | 'customer')",
      schema: { enum: ['admin', 'caregiver', 'customer'] },
    }),
    ApiQuery({
      name: 'search',
      required: false,
      description: 'Tìm kiếm theo tên, username hoặc email',
      example: 'john',
    }),
    ApiQuery({
      name: 'sortBy',
      required: false,
      description: "Cột sắp xếp (vd: 'created_at')",
      example: 'created_at',
    }),
    ApiQuery({
      name: 'order',
      required: false,
      description: "Chiều sắp xếp ('ASC' | 'DESC')",
      schema: { enum: ['ASC', 'DESC'] },
      example: 'DESC',
    }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 20 }),
  ),

  // SEARCH
  search: applyDecorators(
    SwaggerEndpoint({
      tags: ['users'],
      summary: 'Tìm kiếm user theo từ khoá',
      responses: [
        {
          status: 200,
          description: 'Danh sách user tìm kiếm',
          type: UserDto,
          isArray: true,
        },
        { status: 400, description: 'Dữ liệu không hợp lệ' },
      ],
    }),
    ApiQuery({ name: 'keyword', required: false, example: 'user' }),
    ApiQuery({ name: 'q', required: false, description: 'Alias của keyword' }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 20 }),
  ),

  // GET SUMMARIES
  getSummaries: applyDecorators(
    SwaggerEndpoint({
      tags: ['users'],
      summary: 'Lấy summaries (service/payment/cameras/alerts) cho nhiều user',
      responses: [
        { status: 200, description: 'Map user_id -> summary', type: Object },
        { status: 400, description: 'Thiếu hoặc sai tham số ids' },
      ],
    }),
    ApiQuery({
      name: 'ids',
      required: true,
      description: 'Danh sách user_id dạng UUID, ngăn cách bởi dấu phẩy',
      example: '7b2f5e10-9a6f-4c5e-b1a1-000000000001,7b2f5e10-9a6f-4c5e-b1a1-000000000002',
    }),
  ),

  // GET BY ID
  getById: applyDecorators(
    SwaggerEndpoint({
      tags: ['users'],
      summary: 'Lấy thông tin user theo ID',
      responses: [
        { status: 200, description: 'Thông tin user (an toàn)', type: UserDto },
        { status: 404, description: 'User không tồn tại' },
      ],
    }),
    ApiParam({
      name: 'id',
      description: 'User ID (UUID v4)',
      schema: { type: 'string', format: 'uuid' },
    }),
  ),

  // UPDATE (PUT/PATCH dùng chung)
  update: applyDecorators(
    SwaggerEndpoint({
      tags: ['users'],
      summary: 'Cập nhật thông tin user',
      responses: [
        { status: 200, description: 'Cập nhật thành công', type: UserDto },
        { status: 400, description: 'Dữ liệu không hợp lệ' },
      ],
    }),
    ApiBody({ type: CreateUserDto }),
    ApiParam({
      name: 'id',
      description: 'User ID (UUID v4)',
      schema: { type: 'string', format: 'uuid' },
    }),
  ),

  // DELETE (hard)
  delete: applyDecorators(
    SwaggerEndpoint({
      tags: ['users'],
      summary: 'Xoá user (hard delete)',
      responses: [
        { status: 200, description: 'Xoá thành công' },
        { status: 400, description: 'Dữ liệu không hợp lệ' },
      ],
    }),
    ApiParam({
      name: 'id',
      description: 'User ID (UUID v4)',
      schema: { type: 'string', format: 'uuid' },
    }),
  ),

  // SOFT DELETE
  softDelete: applyDecorators(
    SwaggerEndpoint({
      tags: ['users'],
      summary: 'Xoá mềm user (soft delete)',
      responses: [
        { status: 200, description: 'Xoá mềm thành công' },
        { status: 400, description: 'Dữ liệu không hợp lệ' },
      ],
    }),
    ApiParam({
      name: 'id',
      description: 'User ID (UUID v4)',
      schema: { type: 'string', format: 'uuid' },
    }),
  ),

  // INVITE
  invite: applyDecorators(
    SwaggerEndpoint({
      tags: ['users'],
      summary: 'Gửi lời mời tạo tài khoản (stub)',
      responses: [{ status: 200, description: 'Đã gửi lời mời' }],
    }),
    ApiBody({
      schema: {
        example: { email: 'newuser@email.com', role: 'customer', desc: 'Trial' },
      },
    }),
  ),

  // RESET PASSWORD
  resetPassword: applyDecorators(
    SwaggerEndpoint({
      tags: ['users'],
      summary: 'Đặt lại mật khẩu cho user',
      responses: [{ status: 200, description: 'Đặt lại mật khẩu thành công' }],
    }),
    ApiParam({
      name: 'id',
      description: 'User ID (UUID v4)',
      schema: { type: 'string', format: 'uuid' },
    }),
    ApiBody({
      schema: {
        example: { new_password: 'newStrongPassword123' },
      },
    }),
  ),

  // SET STATUS
  setStatus: applyDecorators(
    SwaggerEndpoint({
      tags: ['users'],
      summary: 'Cập nhật trạng thái user',
      responses: [{ status: 200, description: 'Cập nhật trạng thái thành công' }],
    }),
    ApiParam({
      name: 'id',
      description: 'User ID (UUID v4)',
      schema: { type: 'string', format: 'uuid' },
    }),
    ApiBody({
      schema: {
        properties: {
          status: { enum: ['active', 'locked', 'disabled'] },
        },
        example: { status: 'locked' },
      },
    }),
  ),

  // SET ROLE
  setRole: applyDecorators(
    SwaggerEndpoint({
      tags: ['users'],
      summary: 'Cập nhật vai trò (role) user',
      responses: [{ status: 200, description: 'Cập nhật role thành công' }],
    }),
    ApiParam({
      name: 'id',
      description: 'User ID (UUID v4)',
      schema: { type: 'string', format: 'uuid' },
    }),
    ApiBody({
      schema: {
        example: { role: 'caregiver' },
      },
    }),
  ),

  // EXPORT
  exportUsers: applyDecorators(
    SwaggerEndpoint({
      tags: ['users'],
      summary: 'Xuất danh sách users',
      responses: [{ status: 200, description: 'Kết quả export' }],
    }),
    ApiQuery({ name: 'from', required: false, example: '2025-01-01' }),
    ApiQuery({ name: 'to', required: false, example: '2025-12-31' }),
  ),

  // CHECK DUPLICATE
  checkDuplicate: applyDecorators(
    SwaggerEndpoint({
      tags: ['users'],
      summary: 'Kiểm tra trùng email/username',
      responses: [{ status: 200, description: 'Kết quả kiểm tra' }],
    }),
    ApiQuery({ name: 'email', required: false, example: 'user@email.com' }),
    ApiQuery({ name: 'username', required: false, example: 'username1' }),
  ),

  // ACTIVITY LOGS
  activityLogs: applyDecorators(
    SwaggerEndpoint({
      tags: ['users'],
      summary: 'Lấy activity logs của user',
      responses: [
        {
          status: 200,
          description:
            'Danh sách activity logs (summary list). Lưu ý: đây là các entry dạng timeline — không phải per-field audit history; các entry không chứa `change_count` hoặc `changes[]`.',
        },
      ],
    }),
    ApiParam({
      name: 'id',
      description: 'User ID (UUID v4)',
      schema: { type: 'string', format: 'uuid' },
    }),
  ),

  // GET QUOTA
  getQuota: applyDecorators(
    SwaggerEndpoint({
      tags: ['users'],
      summary: 'Lấy thông tin quota của user',
      responses: [{ status: 200, description: 'Thông tin quota của user' }],
    }),
    ApiParam({
      name: 'id',
      description: 'User ID (UUID v4)',
      schema: { type: 'string', format: 'uuid' },
    }),
  ),

  // 2FA SEND
  send2fa: applyDecorators(
    SwaggerEndpoint({
      tags: ['users'],
      summary: 'Gửi mã xác thực 2FA',
      responses: [{ status: 200, description: 'Đã gửi 2FA' }],
    }),
    ApiParam({
      name: 'id',
      description: 'User ID (UUID v4)',
      schema: { type: 'string', format: 'uuid' },
    }),
  ),

  // 2FA VERIFY
  verify2fa: applyDecorators(
    SwaggerEndpoint({
      tags: ['users'],
      summary: 'Xác nhận mã 2FA',
      responses: [{ status: 200, description: 'Xác thực 2FA thành công' }],
    }),
    ApiParam({
      name: 'id',
      description: 'User ID (UUID v4)',
      schema: { type: 'string', format: 'uuid' },
    }),
    ApiBody({
      schema: {
        example: { code: '123456' },
      },
    }),
  ),
};
