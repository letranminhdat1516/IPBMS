import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiParam, ApiBody } from '@nestjs/swagger';

export const AdminUsersSwagger = {
  // --- QUOTA ---
  getQuota: applyDecorators(
    ApiOperation({ summary: 'Lấy quota hiện tại của user' }),
    ApiParam({ name: 'id', description: 'UUID của user' }),
    ApiOkResponse({ description: 'Quota của user trả về thành công' }),
  ),

  updateQuota: applyDecorators(
    ApiOperation({ summary: 'Cập nhật quota cho user' }),
    ApiParam({ name: 'id', description: 'UUID của user' }),
    ApiBody({ schema: { type: 'object', properties: { quota: { type: 'number' } } } }),
    ApiOkResponse({ description: 'Cập nhật quota thành công' }),
  ),

  deleteQuota: applyDecorators(
    ApiOperation({ summary: 'Xoá quota của user' }),
    ApiParam({ name: 'id', description: 'UUID của user' }),
    ApiOkResponse({ description: 'Xóa quota thành công' }),
  ),

  // --- PLAN ---
  getPlan: applyDecorators(
    ApiOperation({ summary: 'Lấy gói dịch vụ hiện tại của user' }),
    ApiParam({ name: 'id', description: 'UUID của user' }),
    ApiOkResponse({ description: 'Thông tin gói dịch vụ trả về thành công' }),
  ),

  updatePlan: applyDecorators(
    ApiOperation({ summary: 'Cập nhật gói dịch vụ cho user' }),
    ApiParam({ name: 'id', description: 'UUID của user' }),
    ApiBody({ schema: { type: 'object', properties: { plan: { type: 'string' } } } }),
    ApiOkResponse({ description: 'Cập nhật gói dịch vụ thành công' }),
  ),
};
