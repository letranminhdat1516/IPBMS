import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { SystemConfigService } from '../../../application/services/system/system-config.service';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { SystemSettingsSwagger } from '../../../swagger/system-config.swagger';
import { CreateOrUpdateSettingDto } from '../../../application/dto/system/system-config.dto';
import { SetSettingValueDto } from '../../../application/dto/system/set-setting-value.dto';

type JwtUser = { userId?: string; sub?: string };

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'customer')
@ApiTags('system-config')
@Controller('system/settings')
export class SystemSettingsController {
  constructor(private readonly _service: SystemConfigService) {}

  @Get()
  @SystemSettingsSwagger.getAll
  async getAllSettings() {
    return this._service.getAllSettings();
  }

  @Get('category/:category')
  @SystemSettingsSwagger.getByCategory
  async getByCategory(@Param('category') category: string) {
    return this._service.getSettingsByCategory(category);
  }

  @Get(':key')
  @SystemSettingsSwagger.getByKey
  async getByKey(@Param('key') key: string) {
    return this._service.getSettingByKey(key);
  }

  @Post()
  @SystemSettingsSwagger.create
  @LogActivity({
    action: 'create_system_config',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo cấu hình hệ thống',
    resource_type: 'system_config',
    resource_name: 'system_config',
    resource_id: 'setting_key',
    severity: ActivitySeverity.HIGH,
  })
  async create(@Body() body: CreateOrUpdateSettingDto) {
    return this._service.createSetting(body);
  }

  @Put(':key')
  @SystemSettingsSwagger.update
  @LogActivity({
    action: 'update_system_config',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật cấu hình hệ thống',
    resource_type: 'system_config',
    resource_name: 'system_config',
    resource_id: 'key',
    severity: ActivitySeverity.HIGH,
  })
  async update(
    @Param('key') key: string,
    @Body() body: CreateOrUpdateSettingDto,
    @Req() _req: { user?: JwtUser },
  ) {
    return this._service.updateSetting(key, body);
  }

  @Delete(':key')
  @SystemSettingsSwagger.delete
  @LogActivity({
    action: 'delete_system_config',
    action_enum: ActivityAction.DELETE,
    message: 'Xóa cấu hình hệ thống',
    resource_type: 'system_config',
    resource_name: 'system_config',
    resource_id: 'key',
    severity: ActivitySeverity.HIGH,
  })
  async remove(@Param('key') key: string) {
    return this._service.deleteSetting(key);
  }

  @Get(':key/value')
  @SystemSettingsSwagger.getValue
  async getValue(@Param('key') key: string) {
    const value = await this._service.getSettingValue(key);
    return { key, value };
  }

  @Put(':key/value')
  @SystemSettingsSwagger.setValue
  @LogActivity({
    action: 'set_system_config_value',
    action_enum: ActivityAction.UPDATE,
    message: 'Thay đổi giá trị cấu hình hệ thống',
    resource_type: 'system_config',
    resource_name: 'system_config',
    resource_id: 'key',
    severity: ActivitySeverity.MEDIUM,
  })
  async setValue(@Param('key') key: string, @Body() body: SetSettingValueDto) {
    return this._service.setSettingValue(key, body.value!, body.updated_by!);
  }
}
