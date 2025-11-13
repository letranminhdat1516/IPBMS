import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiBody, ApiResponse, ApiOkResponse } from '@nestjs/swagger';
import { UpdateSharedPermissionDto } from '../application/dto/shared-permissions/update-shared-permission.dto';
import { SHARED_PERMISSIONS_EXAMPLE } from '../application/utils/shared-permissions';

export class SharedPermissionsSwagger {
  static update = applyDecorators(
    ApiOperation({ summary: 'Cập nhật quyền chia sẻ dữ liệu giữa customer và caregiver' }),
    ApiParam({
      name: 'customer_id',
      type: 'string',
      required: true,
      description: 'UUID của customer',
    }),
    ApiParam({
      name: 'caregiver_id',
      type: 'string',
      required: true,
      description: 'UUID của caregiver',
    }),
    ApiBody({
      type: UpdateSharedPermissionDto,
      examples: {
        default: {
          summary: 'Ví dụ cập nhật quyền',
          value: SHARED_PERMISSIONS_EXAMPLE,
        },
      },
    }),
    ApiResponse({ status: 200, description: 'Cập nhật thành công.' }),
    ApiResponse({ status: 400, description: 'Yêu cầu không hợp lệ' }),
    ApiResponse({ status: 401, description: 'Không xác thực' }),
    ApiResponse({ status: 403, description: 'Không có quyền' }),
  );

  static get = applyDecorators(
    ApiOperation({ summary: 'Lấy quyền chia sẻ hiện tại giữa customer và caregiver' }),
    ApiParam({ name: 'customer_id', type: 'string', required: true }),
    ApiParam({ name: 'caregiver_id', type: 'string', required: true }),
    ApiResponse({ status: 200, description: 'Trả về quyền chia sẻ (SharedPermissions)' }),
    ApiResponse({ status: 404, description: 'Không tìm thấy bản ghi' }),
  );

  static remove = applyDecorators(
    ApiOperation({ summary: 'Xoá quyền chia sẻ giữa customer và caregiver' }),
    ApiParam({ name: 'customer_id', type: 'string', required: true }),
    ApiParam({ name: 'caregiver_id', type: 'string', required: true }),
    ApiResponse({ status: 200, description: 'Xoá thành công' }),
    ApiResponse({ status: 404, description: 'Không tìm thấy bản ghi' }),
  );

  static listByCustomer = applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách caregiver được chia sẻ quyền' }),
    ApiParam({ name: 'customer_id', type: 'string' }),
    ApiOkResponse({
      description: 'Danh sách quyền đã chia sẻ',
      schema: {
        type: 'array',
        items: { example: SHARED_PERMISSIONS_EXAMPLE },
      },
    }),
  );

  static listByCaregiver = applyDecorators(
    ApiOperation({ summary: 'Danh sách quyền được chia sẻ cho caregiver' }),
    ApiParam({ name: 'caregiver_id', type: 'string' }),
    ApiOkResponse({
      description: 'Danh sách quyền',
      schema: {
        type: 'array',
        items: { example: SHARED_PERMISSIONS_EXAMPLE },
      },
    }),
  );
}
