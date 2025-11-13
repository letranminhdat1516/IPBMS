import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiParam, ApiBody } from '@nestjs/swagger';

const CATEGORY_ENUM = ['image', 'alert', 'notification', 'camera', 'privacy'];

export const UserPreferencesSwagger = {
  list: applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách cấu hình của user theo category' }),
    ApiParam({
      name: 'category',
      description: 'Loại setting (image/alert/notification/...)',
      enum: CATEGORY_ENUM,
    }),
    ApiOkResponse({ description: 'Danh sách key-value cấu hình' }),
  ),

  get: applyDecorators(
    ApiOperation({ summary: 'Lấy chi tiết 1 cấu hình theo key' }),
    ApiParam({
      name: 'category',
      description: 'Loại setting (image/alert/notification/...)',
      enum: CATEGORY_ENUM,
    }),
    ApiParam({ name: 'key', description: 'Tên khóa setting' }),
    ApiOkResponse({ description: 'Chi tiết cấu hình' }),
  ),

  getEffective: applyDecorators(
    ApiOperation({
      summary: 'Lấy giá trị tùy chọn đã parse theo data_type với luật ưu tiên user > system',
    }),
    ApiParam({
      name: 'category',
      description: 'Loại setting',
      enum: CATEGORY_ENUM,
    }),
    ApiParam({ name: 'key', description: 'Tên khóa setting' }),
    ApiOkResponse({
      description: 'Giá trị đã parse và nguồn',
      schema: {
        type: 'object',
        properties: {
          value: { description: 'Giá trị đã parse theo data_type' },
          source: { type: 'string', enum: ['user', 'system', 'fallback'] },
        },
      },
    }),
  ),

  set: applyDecorators(
    ApiOperation({ summary: 'Cập nhật giá trị tùy chọn' }),
    ApiParam({
      name: 'category',
      description: 'Loại setting',
      enum: CATEGORY_ENUM,
    }),
    ApiParam({ name: 'key', description: 'Tên khóa setting' }),
    ApiBody({
      required: true,
      schema: {
        type: 'object',
        properties: {
          value: { type: 'string' },
        },
      },
    }),
    ApiOkResponse({ description: 'Cập nhật thành công' }),
  ),

  toggle: applyDecorators(
    ApiOperation({ summary: 'Bật / Tắt tùy chọn theo key' }),
    ApiParam({
      name: 'category',
      description: 'Loại setting',
      enum: CATEGORY_ENUM,
    }),
    ApiParam({ name: 'key', description: 'Tên khóa setting' }),
    ApiBody({
      required: true,
      schema: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
        },
      },
    }),
    ApiOkResponse({ description: 'Cập nhật thành công' }),
  ),

  adminSet: applyDecorators(
    ApiOperation({ summary: 'Admin cập nhật tùy chọn người dùng theo userId/category/key' }),
    ApiParam({ name: 'userId', description: 'ID của user cần cập nhật' }),
    ApiParam({
      name: 'category',
      description: 'Loại setting',
      enum: CATEGORY_ENUM,
    }),
    ApiParam({ name: 'key', description: 'Tên khóa setting' }),
    ApiBody({
      required: true,
      schema: {
        type: 'object',
        properties: {
          value: { type: 'string' },
        },
      },
    }),
    ApiOkResponse({ description: 'Admin cập nhật setting thành công' }),
  ),

  setOverride: applyDecorators(
    ApiOperation({ summary: 'Đặt ghi đè cho tùy chọn người dùng (user tự đặt)' }),
    ApiParam({
      name: 'category',
      description: 'Loại setting',
      enum: CATEGORY_ENUM,
    }),
    ApiParam({ name: 'key', description: 'Tên khóa setting' }),
    ApiBody({
      required: true,
      schema: {
        type: 'object',
        properties: {
          value: { description: 'Giá trị mới (sẽ được validate theo data_type)' },
          enabled: { type: 'boolean', default: true },
        },
      },
    }),
    ApiOkResponse({ description: 'Đặt override thành công' }),
  ),

  resetOverride: applyDecorators(
    ApiOperation({ summary: 'Đặt lại ghi đè của người dùng về mặc định hệ thống' }),
    ApiParam({
      name: 'category',
      description: 'Loại setting',
      enum: CATEGORY_ENUM,
    }),
    ApiParam({ name: 'key', description: 'Tên khóa setting' }),
    ApiOkResponse({ description: 'Reset về system default thành công' }),
  ),
};
