import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CreateRoleDto } from '../application/dto/roles/create-role.dto';

export const RolesSwagger = {
  list: applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách tất cả roles' }),
    ApiOkResponse({
      description: 'Danh sách roles',
      schema: {
        example: [
          { id: 1, name: 'admin', description: 'Quản trị hệ thống' },
          { id: 2, name: 'customer', description: 'Khách hàng sử dụng hệ thống' },
        ],
      },
    }),
  ),

  byId: applyDecorators(
    ApiOperation({ summary: 'Lấy thông tin role theo ID' }),
    ApiParam({ name: 'id', description: 'ID role', example: 1 }),
    ApiOkResponse({
      description: 'Thông tin role',
      schema: {
        example: { id: 1, name: 'admin', description: 'Quản trị hệ thống' },
      },
    }),
  ),

  create: applyDecorators(
    ApiOperation({ summary: 'Tạo role mới' }),
    ApiBody({
      type: CreateRoleDto,
      examples: {
        default: {
          summary: 'Tạo role',
          value: {
            name: 'caregiver',
            description: 'Người chăm sóc bệnh nhân',
          },
        },
      },
    }),
    ApiCreatedResponse({ description: 'Role đã được tạo' }),
  ),

  update: applyDecorators(
    ApiOperation({ summary: 'Cập nhật role theo ID' }),
    ApiParam({ name: 'id', description: 'ID role', example: 2 }),
    ApiBody({
      type: CreateRoleDto,
      examples: {
        update: {
          summary: 'Cập nhật role',
          value: {
            name: 'customer',
            description: 'Khách hàng đã đăng ký gói dịch vụ',
          },
        },
      },
    }),
    ApiOkResponse({ description: 'Role đã được cập nhật' }),
  ),

  remove: applyDecorators(
    ApiOperation({ summary: 'Xoá role theo ID' }),
    ApiParam({ name: 'id', description: 'ID role', example: 3 }),
    ApiOkResponse({
      description: 'Role đã được xoá',
      schema: { example: { deleted: true } },
    }),
  ),
};
