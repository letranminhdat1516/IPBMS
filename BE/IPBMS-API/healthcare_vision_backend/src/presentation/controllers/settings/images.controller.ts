import { Controller, Get, Post, Put, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { ImageSettingsService } from '../../../application/services/image-settings.service';
import {
  UpdateImageSettingDto,
  ToggleImageSettingDto,
  BatchSaveImageSettingsDto,
} from '../../../application/dto/image-settings/image-setting.dto';
import { ImageSettingsSwagger } from '../../../swagger/image-settings.swagger';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@ApiTags('image-settings')
@Controller('image-settings')
export class ImageSettingsController {
  constructor(private readonly _service: ImageSettingsService) {}

  @Get()
  @ImageSettingsSwagger.list
  async findAll(@Req() req: any) {
    const userId = getUserIdFromReq(req);
    return this._service.getCompact(userId);
  }

  @Get(':key')
  @ImageSettingsSwagger.get
  async findByKey(@Param('key') key: string, @Req() req: any) {
    const userId = getUserIdFromReq(req);
    return this._service.get(userId, key);
  }

  @Put(':key')
  @ImageSettingsSwagger.set
  @LogActivity({
    action: 'update_image_setting',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật cấu hình ảnh',
    resource_type: 'image_setting',
    resource_name: 'image_setting',
    resource_id: 'key',
    severity: ActivitySeverity.MEDIUM,
  })
  async update(@Param('key') key: string, @Body() dto: UpdateImageSettingDto, @Req() req: any) {
    const userId = getUserIdFromReq(req);
    return this._service.set(userId, key, dto.value, undefined, userId);
  }

  @Post()
  @ImageSettingsSwagger.batchSave
  @LogActivity({
    action: 'batch_save_image_settings',
    action_enum: ActivityAction.UPDATE,
    message: 'Lưu batch cấu hình ảnh',
    resource_type: 'image_settings',
    resource_name: 'image_settings',
    severity: ActivitySeverity.MEDIUM,
  })
  async batchSave(@Body() dto: BatchSaveImageSettingsDto, @Req() req: any) {
    const userId = getUserIdFromReq(req);
    return this._service.batchSave(userId, dto.settings, userId);
  }

  @Put(':key/toggle')
  @ImageSettingsSwagger.toggle
  @LogActivity({
    action: 'toggle_image_setting',
    action_enum: ActivityAction.UPDATE,
    message: 'Bật/tắt cấu hình ảnh',
    resource_type: 'image_setting',
    resource_name: 'image_setting',
    resource_id: 'key',
    severity: ActivitySeverity.MEDIUM,
  })
  async toggle(@Param('key') key: string, @Body() dto: ToggleImageSettingDto, @Req() req: any) {
    const userId = getUserIdFromReq(req);
    return this._service.toggle(userId, key, dto.enabled, userId);
  }
}
