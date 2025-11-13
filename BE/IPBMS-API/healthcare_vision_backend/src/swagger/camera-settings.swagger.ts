import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CameraSetting } from '../core/entities/camera_settings.entity';
import { CreateCameraSettingDto } from '../application/dto/camera-settings/create-camera-setting.dto';
import { UpdateCameraSettingDto } from '../application/dto/camera-settings/update-camera-setting.dto';

export const CameraSettingsSwagger = {
  list: applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách tất cả camera settings' }),
    ApiOkResponse({ type: CameraSetting, isArray: true }),
  ),

  getById: applyDecorators(
    ApiOperation({ summary: 'Lấy thông tin camera setting theo ID' }),
    ApiParam({ name: 'id', description: 'UUID của camera setting' }),
    ApiOkResponse({ type: CameraSetting }),
  ),

  create: applyDecorators(
    ApiOperation({ summary: 'Tạo mới camera setting' }),
    ApiBody({ type: CreateCameraSettingDto }),
    ApiOkResponse({ description: 'Tạo setting thành công' }),
  ),

  update: applyDecorators(
    ApiOperation({ summary: 'Cập nhật camera setting theo ID' }),
    ApiParam({ name: 'id', description: 'UUID của camera setting' }),
    ApiBody({ type: UpdateCameraSettingDto }),
    ApiOkResponse({ description: 'Cập nhật setting thành công' }),
  ),

  delete: applyDecorators(
    ApiOperation({ summary: 'Xóa camera setting theo ID' }),
    ApiParam({ name: 'id', description: 'UUID của camera setting' }),
    ApiOkResponse({ description: 'Xoá setting thành công' }),
  ),
};
