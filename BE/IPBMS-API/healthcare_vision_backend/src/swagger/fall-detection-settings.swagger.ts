import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { FallDetectionSetting } from '../core/entities/fall_detection_settings.entity';
import { CreateFallDetectionSettingDto } from '../application/dto/fall-detection-settings/create-fall-detection-setting.dto';
import { UpdateFallDetectionSettingDto } from '../application/dto/fall-detection-settings/update-fall-detection-setting.dto';

export const FallDetectionSettingsSwagger = {
  list: applyDecorators(
    ApiOperation({ summary: 'Admin: Lấy danh sách fall detection settings' }),
    ApiOkResponse({ type: FallDetectionSetting, isArray: true }),
  ),

  getById: applyDecorators(
    ApiOperation({ summary: 'Admin: Lấy fall detection setting theo ID' }),
    ApiParam({ name: 'id', description: 'UUID của fall detection setting' }),
    ApiOkResponse({ type: FallDetectionSetting }),
  ),

  create: applyDecorators(
    ApiOperation({ summary: 'Admin: Tạo fall detection setting' }),
    ApiBody({ type: CreateFallDetectionSettingDto }),
    ApiOkResponse({ description: 'Tạo setting thành công' }),
  ),

  update: applyDecorators(
    ApiOperation({ summary: 'Admin: Cập nhật fall detection setting theo ID' }),
    ApiParam({ name: 'id', description: 'UUID của fall detection setting' }),
    ApiBody({ type: UpdateFallDetectionSettingDto }),
    ApiOkResponse({ description: 'Cập nhật setting thành công' }),
  ),

  delete: applyDecorators(
    ApiOperation({ summary: 'Admin: Xoá fall detection setting theo ID' }),
    ApiParam({ name: 'id', description: 'UUID của fall detection setting' }),
    ApiOkResponse({ description: 'Xoá setting thành công' }),
  ),
};
