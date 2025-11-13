import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CreateActivityLogDto } from '../../../application/dto/activity-logs/create-activity-log.dto';
import { ExportActivityLogsDto } from '../../../application/dto/activity-logs/export-activity-logs.dto';
import { UpdateActivityLogDto } from '../../../application/dto/activity-logs/update-activity-log.dto';
import { ActivityLogsService } from '../../../application/services/activity-logs.service';
import {
  ActivityAction,
  ActivityLog,
  ActivitySeverity,
} from '../../../core/entities/activity_logs.entity';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { LogAccessGuard } from '../../../shared/guards/log-access.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { createForbiddenException } from '../../../shared/utils';
import ErrorCodes from '../../../shared/constants/error-codes';
import { ActivityLogsSwagger } from '../../../swagger/activity-logs.swagger';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, LogAccessGuard)
@Roles('admin', 'caregiver', 'customer')
@ApiTags('activity-logs')
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly service: ActivityLogsService) {}

  @Get()
  @ActivityLogsSwagger.list
  @ApiQuery({ name: 'user_id', required: false, description: 'Filter by user ID (optional)' })
  @ApiQuery({
    name: 'actor_name',
    required: false,
    description: 'Filter caregiver name (partial, customer only)',
  })
  async findAll(
    @Query('user_id') user_id?: string,
    @Query('actor_name') actor_name?: string, // 👈 thêm
    @Req() req?: any,
  ): Promise<ActivityLog[]> {
    const role = req?.user?.role;
    const requesterId = req?.user?.userId ?? req?.user?.sub;

    if (role === 'admin') {
      if (user_id) return this.service.findByUserId(user_id);
      return this.service.findAll();
    }

    // Customer: logs của họ + caregivers liên quan, có filter theo tên caregiver
    if (role === 'customer') {
      return this.service.findForCustomerWithCaregivers(requesterId, actor_name); // 👈 pass actor_name
    }

    // Caregiver: giữ nguyên
    if (role === 'caregiver') {
      return this.service.findForCaregiverWithFeedback(requesterId);
    }

    throw createForbiddenException(
      'Không có quyền truy cập logs',
      ErrorCodes.ACTIVITY_LOGS_FORBIDDEN,
    );
  } // =========================
  // CUSTOMER ENDPOINTS
  // =========================

  @Get('customer/self')
  @Roles('customer')
  @ApiOperation({ summary: 'Customer - Xem chỉ hoạt động của chính mình' })
  async getCustomerSelf(@Req() req: any): Promise<ActivityLog[]> {
    const requesterId = req?.user?.userId ?? req?.user?.sub;
    if (!requesterId)
      throw createForbiddenException('Người dùng chưa đăng nhập', ErrorCodes.UNAUTHENTICATED);
    return this.service.findCustomerSelfLogs(requesterId);
  }

  @Get('customer/caregivers')
  @Roles('customer')
  @ApiOperation({
    summary: 'Customer - Xem chỉ hoạt động của các caregiver của mình',
    description:
      'Có thể filter theo tên caregiver (actor_name, tìm kiếm mờ, không phân biệt hoa/thường).',
  })
  @ApiQuery({
    name: 'actor_name',
    required: false,
    description: 'Lọc theo tên caregiver (contains, insensitive)',
  })
  async getCustomerCaregivers(
    @Req() req: any,
    @Query('actor_name') actor_name?: string,
  ): Promise<ActivityLog[]> {
    const customerId = req?.user?.userId ?? req?.user?.sub;
    if (!customerId)
      throw createForbiddenException('Người dùng chưa đăng nhập', ErrorCodes.UNAUTHENTICATED);
    return this.service.findCaregiversLogsForCustomer(customerId, actor_name);
  }

  // =========================
  // CAREGIVER ENDPOINTS
  // =========================

  @Get('caregiver/self')
  @Roles('caregiver')
  @ApiOperation({ summary: 'Caregiver - Xem chỉ hoạt động của chính mình' })
  async getCaregiverSelf(@Req() req: any): Promise<ActivityLog[]> {
    const caregiverId = req?.user?.userId ?? req?.user?.sub;
    if (!caregiverId)
      throw createForbiddenException('Người dùng chưa đăng nhập', ErrorCodes.UNAUTHENTICATED);
    return this.service.findCaregiverSelfLogs(caregiverId);
  }

  @Get('caregiver/feedback')
  @Roles('caregiver')
  @ApiOperation({ summary: 'Caregiver - Xem chỉ feedback từ customer về mình' })
  async getCaregiverFeedback(@Req() req: any): Promise<ActivityLog[]> {
    const caregiverId = req?.user?.userId ?? req?.user?.sub;
    if (!caregiverId)
      throw createForbiddenException('Người dùng chưa đăng nhập', ErrorCodes.UNAUTHENTICATED);
    return this.service.findCaregiverFeedbackLogs(caregiverId);
  }

  @Get('user/:userId')
  @ActivityLogsSwagger.getByUserId
  async findByUserId(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Req() req?: any,
  ): Promise<ActivityLog[]> {
    const role = req?.user?.role;
    const requesterId = req?.user?.userId ?? req?.user?.sub;
    // Admin allowed; LogAccessGuard also enforces caregiver permissions
    if (role === 'admin') return this.service.findByUserId(userId);
    if (!requesterId)
      throw createForbiddenException('Người dùng chưa đăng nhập', ErrorCodes.UNAUTHENTICATED);
    // allow self
    if (requesterId === userId) return this.service.findByUserId(userId);
    // otherwise LogAccessGuard should have validated caregiver permission; call service
    return this.service.findByUserId(userId);
  }

  @Get(':id')
  @ActivityLogsSwagger.getById
  async findById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ActivityLog> {
    return this.service.findById(id);
  }

  @Post()
  @ActivityLogsSwagger.create
  @LogActivity({
    action: 'create_activity_log',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo mới activity log',
    resource_type: 'activity_log',
    resource_name: 'activity_log',
    resource_id: '@result.id',
    severity: ActivitySeverity.INFO,
  })
  async create(@Body() data: CreateActivityLogDto) {
    return this.service.create(data);
  }

  @Put(':id')
  @ActivityLogsSwagger.update
  @LogActivity({
    action: 'update_activity_log',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật activity log',
    resource_type: 'activity_log',
    resource_name: 'activity_log',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() data: UpdateActivityLogDto,
  ) {
    await this.service.update(id, data);
    return { message: 'Activity log cập nhật thành công' };
  }

  @Delete(':id')
  @ActivityLogsSwagger.delete
  @LogActivity({
    action: 'delete_activity_log',
    action_enum: ActivityAction.DELETE,
    message: 'Xóa activity log',
    resource_type: 'activity_log',
    resource_name: 'activity_log',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.service.remove(id);
    return { message: 'Activity log đã bị xóa' };
  }

  @Get('export')
  @ApiOperation({
    summary: 'Xuất activity logs',
    description: 'Xuất dữ liệu activity logs ra CSV hoặc JSON với filter tùy chọn',
  })
  @ApiQuery({ name: 'from', required: false, description: 'Ngày bắt đầu (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'Ngày kết thúc (YYYY-MM-DD)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Lọc theo user ID' })
  @ApiQuery({ name: 'severity', required: false, description: 'Lọc theo mức độ' })
  @ApiQuery({ name: 'action', required: false, description: 'Lọc theo action' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'json'],
    description: 'Định dạng export',
  })
  @ApiResponse({
    status: 200,
    description: 'Dữ liệu export',
    content: {
      'text/csv': { schema: { type: 'string' } },
      'application/json': { schema: { type: 'string' } },
    },
  })
  @LogActivity({
    action: 'export_activity_logs',
    action_enum: ActivityAction.EXPORT,
    message: 'Xuất dữ liệu activity logs',
    resource_type: 'activity_log',
    resource_name: 'activity_logs_export',
    resource_id: 'literal:export',
    severity: ActivitySeverity.INFO,
  })
  async export(@Query() query: ExportActivityLogsDto, @Res() res: Response) {
    const result = await this.service.exportLogs(query);

    if (query.format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    } else {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    }
  }
}
