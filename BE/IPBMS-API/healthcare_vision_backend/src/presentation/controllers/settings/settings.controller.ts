import type { JwtUser } from '@/shared/types/auth.types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserPreferencesService } from '../../../application/services/users/user-preferences.service';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';
import { UserPreferencesSwagger } from '../../../swagger/user-preferences.swagger';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer', 'admin')
@Controller('settings')
export class SettingsController {
  constructor(private readonly _service: UserPreferencesService) {}

  // ===== ADMIN SETTINGS MANAGEMENT =====

  @Put('admin/:userId/:category/:key')
  @Roles('admin')
  @UserPreferencesSwagger.adminSet
  @LogActivity({
    action: 'admin_update_user_preference',
    action_enum: ActivityAction.UPDATE,
    message: 'Admin cập nhật setting cho user',
    resource_type: 'user_preference',
    resource_name: 'user_preference',
    resource_id: 'userId',
    severity: ActivitySeverity.HIGH,
  })
  async adminSet(
    @Param('userId') userId: string,
    @Param('category') category: string,
    @Param('key') key: string,
    @Body('value') value: unknown,
    @Req() req: { user?: JwtUser },
  ) {
    const adminId = getUserIdFromReq(req);
    return this._service.set(userId, category, key, String(value), undefined, adminId);
  }

  // ===== USER SETTINGS MANAGEMENT =====

  @Get(':category')
  @UserPreferencesSwagger.list
  list(@Param('category') category: string, @Req() req: { user?: JwtUser }) {
    return this._service.list(getUserIdFromReq(req), category);
  }

  @Get(':category/:key')
  @UserPreferencesSwagger.get
  get(
    @Param('category') category: string,
    @Param('key') key: string,
    @Req() req: { user?: JwtUser },
  ) {
    return this._service.get(getUserIdFromReq(req), category, key);
  }

  @Put(':category/:key')
  @UserPreferencesSwagger.set
  @LogActivity({
    action: 'update_user_preference',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật tùy chọn người dùng',
    resource_type: 'user_preference',
    resource_name: 'user_preference',
    resource_id: 'setting_key', // 🟢 log theo cột DB
    severity: ActivitySeverity.MEDIUM,
  })
  set(
    @Param('category') category: string,
    @Param('key') key: string,
    @Body('value') value: string,
    @Req() req?: { user?: JwtUser },
  ) {
    const userId = getUserIdFromReq(req!);
    return this._service.set(userId, category, key, value, undefined, userId);
  }

  @Put(':category/:key/toggle')
  @UserPreferencesSwagger.toggle
  @LogActivity({
    action: 'toggle_user_preference',
    action_enum: ActivityAction.UPDATE,
    message: 'Bật/tắt tùy chọn người dùng',
    resource_type: 'user_preference',
    resource_name: 'user_preference',
    resource_id: 'setting_key', // 🟢 log theo cột DB
    severity: ActivitySeverity.MEDIUM,
  })
  toggle(
    @Param('category') category: string,
    @Param('key') key: string,
    @Body('enabled', ParseBoolPipe) enabled: boolean,
    @Req() req?: { user?: JwtUser },
  ) {
    const userId = getUserIdFromReq(req!);
    return this._service.toggle(userId, category, key, enabled, userId);
  }

  @Get('effective/:category/:key')
  @UserPreferencesSwagger.getEffective
  getEffective(
    @Param('category') category: string,
    @Param('key') key: string,
    @Req() req: { user?: JwtUser },
  ) {
    return this._service.getEffectiveSetting(key, {
      userId: getUserIdFromReq(req),
      category,
    });
  }

  @Put('override/:category/:key')
  @UserPreferencesSwagger.setOverride
  @LogActivity({
    action: 'set_user_preference_override',
    action_enum: ActivityAction.UPDATE,
    message: 'Đặt override setting cho user',
    resource_type: 'user_preference',
    resource_name: 'user_preference',
    resource_id: 'setting_key',
    severity: ActivitySeverity.MEDIUM,
  })
  setOverride(
    @Param('category') category: string,
    @Param('key') key: string,
    @Req() req: { user?: JwtUser },
    @Body('value') value: any,
    @Body('enabled') enabled?: boolean,
  ) {
    const userId = getUserIdFromReq(req);
    return this._service.setUserSettingOverride(userId, key, value, {
      category,
      enabled,
      updatedBy: userId,
    });
  }

  @Delete('override/:category/:key')
  @UserPreferencesSwagger.resetOverride
  @LogActivity({
    action: 'reset_user_preference_override',
    action_enum: ActivityAction.UPDATE,
    message: 'Đặt lại tùy chọn người dùng về mặc định hệ thống',
    resource_type: 'user_preference',
    resource_name: 'user_preference',
    resource_id: 'setting_key',
    severity: ActivitySeverity.MEDIUM,
  })
  resetOverride(
    @Param('category') category: string,
    @Param('key') key: string,
    @Req() req: { user?: JwtUser },
  ) {
    const userId = getUserIdFromReq(req);
    return this._service.resetUserSettingOverride(userId, key, {
      category,
      updatedBy: userId,
    });
  }
}
