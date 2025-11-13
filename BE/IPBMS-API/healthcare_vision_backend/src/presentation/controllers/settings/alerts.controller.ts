import type { JwtUser } from '@/shared/types/auth.types';
import { Body, Controller, Get, Param, ParseBoolPipe, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AlertSettingsService } from '../../../application/services/alert-settings.service';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';
import { AlertSettingsSwagger } from '../../../swagger/alert-settings.swagger';

@ApiTags('alert-settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer', 'admin')
@Controller('alert-settings')
export class AlertSettingsController {
  constructor(private readonly service: AlertSettingsService) {}

  @Get()
  @AlertSettingsSwagger.list
  list(@Req() req: { user?: JwtUser }) {
    return this.service.list(getUserIdFromReq(req));
  }

  @Get(':key')
  @AlertSettingsSwagger.get
  get(@Param('key') key: string, @Req() req: { user?: JwtUser }) {
    return this.service.get(getUserIdFromReq(req), key);
  }

  @Put(':key')
  @AlertSettingsSwagger.set
  @LogActivity({
    action: 'set_alert_setting',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật alert setting',
    resource_type: 'alert_setting',
    resource_name: 'alert_setting',
    resource_id: 'key',
    severity: ActivitySeverity.MEDIUM,
  })
  set(@Param('key') key: string, @Body('value') value: any, @Req() req?: { user?: JwtUser }) {
    const userId = getUserIdFromReq(req!);
    return this.service.set(
      userId,
      key,
      value !== undefined ? String(value) : undefined,
      undefined,
      userId,
    );
  }

  @Put(':key/toggle')
  @AlertSettingsSwagger.toggle
  @LogActivity({
    action: 'toggle_alert_setting',
    action_enum: ActivityAction.UPDATE,
    message: 'Bật/tắt alert setting',
    resource_type: 'alert_setting',
    resource_name: 'alert_setting',
    resource_id: 'key',
    severity: ActivitySeverity.INFO,
  })
  toggle(
    @Param('key') key: string,
    @Body('enabled', ParseBoolPipe) enabled: boolean,
    @Req() req?: { user?: JwtUser },
  ) {
    const userId = getUserIdFromReq(req!);
    return this.service.toggle(userId, key, enabled, userId);
  }
}
