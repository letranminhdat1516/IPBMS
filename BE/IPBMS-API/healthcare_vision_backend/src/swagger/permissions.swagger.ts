import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CreatePermissionDto } from '../application/dto/permissions/create-permission.dto';

export const PermissionsSwagger = {
  list: applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách tất cả permissions' }),
    ApiOkResponse({
      description: 'Danh sách permissions',
      schema: {
        example: [
          { id: 1, name: 'view_patient', description: 'Xem hồ sơ bệnh nhân' },
          { id: 2, name: 'edit_patient', description: 'Chỉnh sửa hồ sơ bệnh nhân' },
        ],
      },
    }),
  ),

  byId: applyDecorators(
    ApiOperation({ summary: 'Lấy chi tiết permission theo ID' }),
    ApiParam({ name: 'id', description: 'ID permission', example: 1 }),
    ApiOkResponse({
      description: 'Chi tiết permission',
      schema: {
        example: { id: 1, name: 'view_patient', description: 'Xem hồ sơ bệnh nhân' },
      },
    }),
  ),

  create: applyDecorators(
    ApiOperation({ summary: 'Tạo permission mới' }),
    ApiBody({
      type: CreatePermissionDto,
      examples: {
        default: {
          summary: 'Tạo quyền mới',
          value: {
            name: 'view_patient',
            description: 'Cho phép xem hồ sơ bệnh nhân',
          },
        },
      },
    }),
    ApiCreatedResponse({ description: 'Permission đã được tạo' }),
  ),

  update: applyDecorators(
    ApiOperation({ summary: 'Cập nhật permission theo ID' }),
    ApiParam({ name: 'id', description: 'ID permission', example: 1 }),
    ApiBody({
      type: CreatePermissionDto,
      examples: {
        update: {
          summary: 'Cập nhật quyền',
          value: {
            name: 'edit_patient',
            description: 'Cho phép chỉnh sửa hồ sơ bệnh nhân',
          },
        },
      },
    }),
    ApiOkResponse({ description: 'Permission đã được cập nhật' }),
  ),

  remove: applyDecorators(
    ApiOperation({ summary: 'Xóa permission theo ID' }),
    ApiParam({ name: 'id', description: 'ID permission', example: 1 }),
    ApiOkResponse({
      description: 'Permission đã được xóa',
      schema: { example: { deleted: true } },
    }),
  ),
};
