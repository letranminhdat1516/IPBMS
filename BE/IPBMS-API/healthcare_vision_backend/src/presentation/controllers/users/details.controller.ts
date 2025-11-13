import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import type { Response } from 'express';
import { IncludeQueryDto } from '../../../application/dto/common/include-query.dto';
import { AdminResponseDto } from '../../../application/dto/user-detail/admin.dto';
import {
  AlertItemDto,
  AlertsQueryDto,
  AlertsResponseDto,
} from '../../../application/dto/user-detail/alerts.dto';
import {
  MonitoringResponseDto,
  MonitoringSettingsDto,
  MonitoringTimelineItemDto,
} from '../../../application/dto/user-detail/monitoring.dto';
import { MonitoringQueryDto } from '../../../application/dto/user-detail/monitoring.query.dto';
import { OverviewResponseDto } from '../../../application/dto/user-detail/overview.dto';
import { ServicesResponseDto } from '../../../application/dto/user-detail/services.dto';
import { AccessControlService } from '../../../application/services/access-control.service';
import { UserDetailsService } from '../../../application/services/users';
import { CacheControl } from '../../../shared/decorators/cache-control.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { DateUtcDayPipe } from '../../../shared/pipes/date-utc-day.pipe';
import { UserDetailsSwagger } from '../../../swagger/user-details.swagger';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@ApiTags('user-details')
@Controller('users/:id')
export class UserDetailsController {
  constructor(
    private readonly svc: UserDetailsService,
    private readonly acl: AccessControlService,
  ) {}

  private async assertAccess(req: { user?: { userId: string; role?: string } }, id: string) {
    const role = req?.user?.role;
    const requesterId = req?.user?.userId;
    if (role === 'customer' && requesterId !== id) {
      throw new ForbiddenException('Bạn chỉ có thể truy cập dữ liệu của chính mình');
    }
    if (role === 'caregiver' && requesterId !== id) {
      const ok = await this.acl.caregiverCanAccessPatient(requesterId!, id);
      if (!ok) throw new ForbiddenException('Người chăm sóc chưa được chỉ định cho bệnh nhân này');
    }
  }

  @Get('overview')
  @UserDetailsSwagger.overview
  @CacheControl(60)
  @ApiQuery({ name: 'range', required: false, enum: ['today', '7d', '30d'] })
  async overview(
    @Param('id') id: string,
    @Query('range') range?: 'today' | '7d' | '30d',
    @Res({ passthrough: true }) res?: Response,
    @Req() req?: { user?: { userId: string; role?: string } },
  ): Promise<OverviewResponseDto> {
    await this.assertAccess(req ?? {}, id);
    return this.svc.overview(id, range ?? '7d');
  }

  @Get('alerts')
  @UserDetailsSwagger.alerts
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async alerts(
    @Param('id') id: string,
    @Query() query: AlertsQueryDto,
    @Req() req?: { user?: { userId: string; role?: string } },
  ): Promise<AlertsResponseDto> {
    await this.assertAccess(req ?? {}, id);
    const raw = await this.svc.alerts(id, query as unknown as Record<string, unknown>);
    return {
      ...raw,
      items: plainToInstance(AlertItemDto, raw.items),
    } satisfies AlertsResponseDto;
  }

  @Get('monitoring')
  @UserDetailsSwagger.monitoring
  @CacheControl(60)
  @ApiQuery({ name: 'include', required: false })
  @ApiQuery({ name: 'date', required: false, description: 'Date in YYYY-MM-DD' })
  async monitoring(
    @Param('id') id: string,
    @Query() query: MonitoringQueryDto,
    @Query('date', new DateUtcDayPipe({ strict: true }))
    dateNorm?: { date: string; startUtcISO: string; endUtcISO: string },
    @Res({ passthrough: true }) res?: Response,
    @Req() req?: { user?: { userId: string; role?: string } },
  ): Promise<MonitoringResponseDto> {
    await this.assertAccess(req ?? {}, id);
    const raw = await this.svc.monitoringGet(id, {
      include: query.include,
      date: dateNorm?.date ?? query.date,
    });
    return {
      ...raw,
      timeline: raw.timeline?.map((item) => plainToInstance(MonitoringTimelineItemDto, item)),
    } satisfies MonitoringResponseDto;
  }

  @Patch('monitoring/settings')
  @UserDetailsSwagger.patchMonitoring
  @LogActivity({
    action: 'update_monitoring_settings',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật cài đặt monitoring',
    resource_type: 'monitoring_settings',
    resource_id: 'id',
    resource_name: 'monitoring_settings',
    severity: ActivitySeverity.MEDIUM,
  })
  async patchMonitoring(
    @Param('id') id: string,
    @Body() patch: Partial<MonitoringSettingsDto>,
    @Req() req: { user?: { userId: string; role?: string } },
  ) {
    await this.assertAccess(req ?? {}, id);
    return this.svc.monitoringPatch(id, patch, req?.user?.userId);
  }

  @Get('services')
  @UserDetailsSwagger.services
  @CacheControl(300)
  async services(
    @Param('id') id: string,
    @Query() query?: IncludeQueryDto,
    @Res({ passthrough: true }) res?: Response,
    @Req() req?: { user?: { userId: string; role?: string } },
  ): Promise<ServicesResponseDto> {
    await this.assertAccess(req ?? {}, id);
    const list = query?.include;
    return this.svc.services(id, list);
  }

  @Get('admin')
  @Roles('admin')
  @UserDetailsSwagger.admin
  async admin(@Param('id') id: string): Promise<AdminResponseDto> {
    return this.svc.admin(id);
  }
}
