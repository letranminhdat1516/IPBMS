import { Controller, ForbiddenException, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { EventsService } from '../../../application/services/events';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { AuthenticatedRequest } from '../../../shared/types/auth.types';
import { EventLogsSwagger } from '../../../swagger/event-logs.swagger';
import { timeUtils } from '../../../shared/constants/time.constants';

@ApiBearerAuth()
@ApiTags('event-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@Controller('event/logs')
export class EventLogsController {
  constructor(private readonly _eventsService: EventsService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date ISO' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date ISO' })
  @ApiQuery({ name: 'severity', required: false, description: 'Comma-separated severities' })
  @ApiQuery({ name: 'status', required: false, description: 'Comma-separated statuses' })
  @ApiQuery({ name: 'type', required: false, description: 'Comma-separated types' })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    enum: ['created_at', 'detected_at', 'confidence_score'],
  })
  @ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'camera_id', required: false })
  @ApiQuery({ name: 'timeRange', required: false })
  @ApiQuery({ name: 'period', required: false })
  @EventLogsSwagger.list
  async getEventLogs(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '50',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('orderBy') orderBy?: 'created_at' | 'detected_at' | 'confidence_score',
    @Query('order') order?: 'ASC' | 'DESC',
    @Query('camera_id') camera_id?: string,
    @Query('timeRange') timeRange?: string,
    @Query('period') period?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    let _dateFrom = dateFrom;
    let _dateTo = dateTo;
    if (timeRange) {
      const now = new Date();
      switch (timeRange) {
        case 'Last 3 Days':
          _dateFrom = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
          _dateTo = now.toISOString();
          break;
        case 'Last 7 Days':
          _dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          _dateTo = now.toISOString();
          break;
        case 'Today':
          _dateFrom = new Date(now.setHours(0, 0, 0, 0)).toISOString();
          _dateTo = new Date(now.setHours(23, 59, 59, 999)).toISOString();
          break;
      }
    }
    if (period && _dateFrom && _dateTo) {
      const baseDate = new Date(_dateFrom);
      switch (period) {
        case 'Morning':
          _dateFrom = new Date(baseDate.setHours(6, 0, 0, 0)).toISOString();
          _dateTo = new Date(baseDate.setHours(11, 59, 59, 999)).toISOString();
          break;
        case 'Afternoon':
          _dateFrom = new Date(baseDate.setHours(12, 0, 0, 0)).toISOString();
          _dateTo = new Date(baseDate.setHours(17, 59, 59, 999)).toISOString();
          break;
        case 'Evening':
          _dateFrom = new Date(baseDate.setHours(18, 0, 0, 0)).toISOString();
          _dateTo = new Date(baseDate.setHours(21, 59, 59, 999)).toISOString();
          break;
        case 'Night':
          _dateFrom = new Date(baseDate.setHours(22, 0, 0, 0)).toISOString();
          _dateTo = new Date(baseDate.setHours(23, 59, 59, 999)).toISOString();
          break;
      }
    }
    const severityArr = severity ? severity.split(',') : undefined;
    const statusArr = status ? status.split(',') : undefined;
    const typeArr = type ? type.split(',') : undefined;

    const role = req?.user?.role;
    // support older JWTs where sub may be present instead of userId
    const requesterId: string | undefined =
      req?.user?.userId ?? (req?.user?.sub as string | undefined);

    const filters = {
      page: page ? Number(page) : 1,
      limit: pageSize ? Number(pageSize) : 50,
      dateFrom: _dateFrom,
      dateTo: _dateTo,
      severity: severityArr,
      status: statusArr,
      type: typeArr,
      orderBy: orderBy || 'created_at',
      order: order || 'DESC',
      camera_id,
    } as any;

    let result: any;
    switch (role) {
      case 'admin':
        result = await this._eventsService.listPaginated(filters);
        break;
      case 'caregiver':
        if (!requesterId) throw new ForbiddenException('Thiếu ID người chăm sóc');
        result = await this._eventsService.listPaginatedForCaregiver(requesterId, filters);
        break;
      case 'customer':
        if (!requesterId) throw new ForbiddenException('Thiếu ID khách hàng');
        result = await this._eventsService.listPaginatedForOwner(requesterId, filters);
        break;
      default:
        result = { data: [], total: 0 };
    }

    // Sanitize sensitive camera fields before returning to clients.
    // Repository returns { data: events[]; total }
    if (result && Array.isArray(result.data)) {
      const sanitizeCamera = (cam: any) => {
        if (!cam || typeof cam !== 'object') return cam;
        const copy = { ...cam } as any;
        // remove sensitive fields if present
        delete copy.username;
        delete copy.password;
        delete copy.ip_address;
        delete copy.rtsp_url;
        return copy;
      };

      const sanitizedItems = result.data.map((ev: any) => {
        const cloned = { ...ev };
        if (cloned.cameras) cloned.cameras = sanitizeCamera(cloned.cameras);
        if (cloned.snapshots && typeof cloned.snapshots === 'object') {
          const snap = { ...cloned.snapshots };
          if (snap.camera) snap.camera = sanitizeCamera(snap.camera);
          cloned.snapshots = snap;
        }
        return cloned;
      });

      const baseOut: any = { data: sanitizedItems, total: result.total };
      if (_dateFrom || _dateTo) {
        try {
          baseOut.meta = {
            dateFrom: _dateFrom,
            dateFrom_local: _dateFrom ? timeUtils.toTimezoneIsoString(new Date(_dateFrom)) : null,
            dateTo: _dateTo,
            dateTo_local: _dateTo ? timeUtils.toTimezoneIsoString(new Date(_dateTo)) : null,
          };
        } catch {
          // ignore timezone conversion errors
        }
      }
      return baseOut;
    }

    return result;
  }
}
