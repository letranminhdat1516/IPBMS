import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { CreateOrUpdateSettingDto } from '../application/dto/system/system-config.dto';
import { SetSettingValueDto } from '../application/dto/system/set-setting-value.dto';

export const SystemSettingsSwagger = {
  getAll: applyDecorators(
    ApiOperation({ summary: 'Lấy toàn bộ cấu hình hệ thống' }),
    ApiResponse({ status: 200, description: 'Danh sách cấu hình hệ thống' }),
  ),

  getByCategory: applyDecorators(
    ApiOperation({ summary: 'Lấy cấu hình hệ thống theo category' }),
    ApiParam({ name: 'category', required: true, type: String }),
  ),

  getByKey: applyDecorators(
    ApiOperation({ summary: 'Lấy cấu hình hệ thống theo key' }),
    ApiParam({ name: 'key', required: true, type: String }),
  ),

  create: applyDecorators(
    ApiOperation({ summary: 'Tạo cấu hình hệ thống mới' }),
    ApiBody({ type: CreateOrUpdateSettingDto }),
    ApiResponse({ status: 201, description: 'Tạo thành công', type: CreateOrUpdateSettingDto }),
  ),

  update: applyDecorators(
    ApiOperation({ summary: 'Cập nhật cấu hình hệ thống' }),
    ApiParam({ name: 'key', required: true, type: String }),
    ApiBody({ type: CreateOrUpdateSettingDto }),
    ApiResponse({
      status: 200,
      description: 'Cập nhật thành công',
      type: CreateOrUpdateSettingDto,
    }),
  ),

  delete: applyDecorators(
    ApiOperation({ summary: 'Xóa cấu hình hệ thống' }),
    ApiParam({ name: 'key', required: true, type: String }),
    ApiResponse({ status: 200, description: 'Xoá thành công' }),
  ),

  getValue: applyDecorators(
    ApiOperation({ summary: 'Lấy giá trị cấu hình theo key' }),
    ApiParam({ name: 'key', required: true, type: String }),
    ApiResponse({ status: 200, description: 'Lấy giá trị thành công' }),
  ),

  setValue: applyDecorators(
    ApiOperation({ summary: 'Cập nhật giá trị cấu hình' }),
    ApiParam({ name: 'key', required: true, type: String }),
    ApiBody({ type: SetSettingValueDto }),
    ApiResponse({ status: 200, description: 'Cập nhật giá trị thành công' }),
  ),
};
