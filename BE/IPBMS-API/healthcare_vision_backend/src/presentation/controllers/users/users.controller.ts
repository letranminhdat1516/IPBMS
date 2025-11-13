import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { isUUID } from 'class-validator';
import { CreateUserDto } from '../../../application/dto/user/create-user.dto';
import { UserDto } from '../../../application/dto/user/user.dto';
import { UsersService } from '../../../application/services/users';
import { AlertSettingsService } from '../../../application/services/alert-settings.service';
import { CameraSettingsService } from '../../../application/services/devices';
import { User } from '../../../core/entities/users.entity';
import { PaginateOptions } from '../../../core/types/paginate.types';
import { Paginate } from '../../../shared/decorators/paginate.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { UsersSwagger } from '../../../swagger/users.swagger';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { LogAccess } from '../../../shared/decorators/log-access.decorator';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';
import { AuthenticatedRequest } from '../../../shared/types/auth.types';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly alertSettingsService: AlertSettingsService,
    private readonly cameraSettingsService: CameraSettingsService,
  ) {}

  @Get('export')
  @UsersSwagger.exportUsers
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Ngày bắt đầu (ISO 8601). Ví dụ: 2025-01-01',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Ngày kết thúc (ISO 8601). Ví dụ: 2025-12-31',
  })
  async exportUsers(@Query('from') from?: string, @Query('to') to?: string) {
    return this.usersService.exportUsers({ from, to });
  }

  private async withSummariesIfRequested(data: any[], _include?: string) {
    const ids = data.map((u) => (u as any).user_id).filter(Boolean);
    const summaries = await this.usersService.getSummaries(ids);
    return data.map((u: any) => {
      const summary = summaries[u.user_id] || {};
      return {
        ...u,
        plan_name: summary.plan_name,
        plan_code: summary.plan_code,
        camera_quota: summary.camera_quota,
        camera_quota_used: summary.camera_quota_used,
        alerts_total: summary.alerts_total,
        alerts_unresolved: summary.alerts_unresolved,
        payments_total: summary.payments_total,
        payments_pending: summary.payments_pending,
        subscription_status: summary.subscription_status,
        subscription_expires_at: summary.subscription_expires_at,
      };
    });
  }

  @Get()
  @UsersSwagger.getAll
  @ApiQuery({ name: 'include', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  @ApiQuery({ name: 'role', required: false, enum: ['admin', 'caregiver', 'customer'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'] })
  async findAll(
    @Paginate() query?: PaginateOptions,
    @Query('include') include?: string,
    @Query('status') status?: 'active' | 'inactive',
    @Query('role') role?: 'admin' | 'caregiver' | 'customer',
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'ASC' | 'DESC',
  ) {
    if (
      query &&
      (query.page ||
        query.limit ||
        query.order ||
        query.where ||
        sortBy ||
        status ||
        role ||
        search ||
        page ||
        limit)
    ) {
      const q: PaginateOptions = { ...query };

      // Handle explicit page/limit parameters
      if (page) q.page = page;
      if (limit) q.limit = limit;

      if (sortBy) {
        q.order = { [sortBy]: (order || 'DESC') as 'ASC' | 'DESC' } as any;
      }

      // Build where clause
      const whereConditions: any = { ...(q.where as any) };

      if (status) {
        whereConditions.is_active = status === 'active';
      }

      if (role) {
        whereConditions.role = role;
      }

      if (search) {
        whereConditions.OR = [
          { full_name: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      q.where = whereConditions;
      const res = await this.usersService.paginateDynamic(q);
      const dtoData = plainToInstance(UserDto, res.data, {
        excludeExtraneousValues: true,
      });
      const data = await this.withSummariesIfRequested(dtoData, include);
      return { ...res, data };
    }
    const arr = await this.usersService.findAll();
    const dtoData = plainToInstance(UserDto, arr, {
      excludeExtraneousValues: true,
    });
    return this.withSummariesIfRequested(dtoData as any[], include);
  }

  @Get('search')
  @UsersSwagger.search
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'q', required: false })
  async search(
    @Query('keyword') keyword: string = '',
    @Query('q') q?: string,
    @Paginate() query?: PaginateOptions,
  ) {
    const term = (q ?? keyword) || '';
    const res = await this.usersService.paginateWithSearch(
      term,
      query?.page,
      query?.limit,
      (query?.order as Record<string, 'ASC' | 'DESC'>) ?? { created_at: 'DESC' },
    );
    return {
      ...res,
      data: plainToInstance(UserDto, res.data, {
        excludeExtraneousValues: true,
      }),
    };
  }

  @Get('summary')
  @UsersSwagger.getSummaries
  @ApiQuery({ name: 'ids', required: true, description: 'Comma-separated UUIDs' })
  async summaries(@Query('ids') ids?: string) {
    if (!ids || !ids.trim()) {
      throw new BadRequestException('Query param "ids" is required');
    }
    const list = ids
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const valid = list.filter((id) => isUUID(id));
    if (valid.length === 0) return {};
    return this.usersService.getSummaries(valid);
  }

  @Get('profile/:id')
  @UsersSwagger.getById
  async findById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<UserDto> {
    const u = await this.usersService.findById(id);
    return plainToInstance(UserDto, u, { excludeExtraneousValues: true });
  }

  @Get(':id')
  @UsersSwagger.getById
  async findByIdDirect(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<any> {
    const u = await this.usersService.findById(id);
    const userDto = plainToInstance(UserDto, u, { excludeExtraneousValues: true });
    const summaries = await this.usersService.getSummaries([id]);
    const summary = summaries[id] || {};
    return {
      ...userDto,
      plan_name: summary.plan_name,
      plan_code: summary.plan_code,
      camera_quota: summary.camera_quota,
      camera_quota_used: summary.camera_quota_used,
      alerts_total: summary.alerts_total,
      alerts_unresolved: summary.alerts_unresolved,
      payments_total: summary.payments_total,
      payments_pending: summary.payments_pending,
      subscription_status: summary.subscription_status,
      subscription_expires_at: summary.subscription_expires_at,
    };
  }

  @Post()
  @UsersSwagger.create
  @LogActivity({
    action: 'create_user',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo người dùng mới',
    resource_type: 'user',
    resource_name: 'full_name',
    severity: ActivitySeverity.HIGH,
  })
  async create(@Body() userData: CreateUserDto): Promise<User> {
    return this.usersService.create(userData);
  }

  @Put(':id')
  @UsersSwagger.update
  @LogActivity({
    action: 'update_user_profile',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật thông tin người dùng',
    resource_type: 'user',
    resource_id: 'id',
    resource_name: 'full_name',
    severity: ActivitySeverity.MEDIUM,
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() userData: Partial<User>,
  ): Promise<User> {
    return this.usersService.update(id, userData);
  }

  @Patch(':id')
  @UsersSwagger.update
  @LogActivity({
    action: 'update_user_profile',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật thông tin người dùng',
    resource_type: 'user',
    resource_id: 'id',
    resource_name: 'full_name',
    severity: ActivitySeverity.MEDIUM,
  })
  async patch(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() userData: Partial<User>,
  ): Promise<User> {
    return this.usersService.update(id, userData);
  }

  @Delete(':id')
  @UsersSwagger.delete
  @LogActivity({
    action: 'delete_user',
    action_enum: ActivityAction.DELETE,
    message: 'Xóa người dùng',
    resource_type: 'user',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.usersService.remove(id);
  }

  @Delete(':id/soft')
  @UsersSwagger.softDelete
  @LogActivity({
    action: 'soft_delete_user',
    action_enum: ActivityAction.UPDATE,
    message: 'Xóa mềm người dùng',
    resource_type: 'user',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async softDelete(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.usersService.softDelete(id);
  }

  @Post('invite')
  @UsersSwagger.invite
  @LogActivity({
    action: 'invite_user',
    action_enum: ActivityAction.CREATE,
    message: 'Mời người dùng mới',
    resource_type: 'user',
    severity: ActivitySeverity.INFO,
  })
  async invite(@Body() body: { email: string; role?: string; desc?: string }) {
    return { invited: true, email: body.email, role: body.role ?? 'customer' };
  }

  @Post(':id/reset-password')
  @UsersSwagger.resetPassword
  @LogActivity({
    action: 'reset_user_password',
    action_enum: ActivityAction.UPDATE,
    message: 'Reset mật khẩu người dùng',
    resource_type: 'user',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  async resetPassword(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body('new_password') newPassword: string,
  ) {
    return this.usersService.resetPassword(id, newPassword);
  }

  @Patch(':id/status')
  @UsersSwagger.setStatus
  @LogActivity({
    action: 'update_user_status',
    action_enum: ActivityAction.UPDATE,
    message: 'Thay đổi trạng thái người dùng',
    resource_type: 'user',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async setStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body('status') status: 'active' | 'locked' | 'disabled',
  ) {
    return this.usersService.setStatus(id, status);
  }

  @Patch(':id/role')
  @UsersSwagger.setRole
  @LogActivity({
    action: 'update_user_role',
    action_enum: ActivityAction.UPDATE,
    message: 'Thay đổi quyền người dùng',
    resource_type: 'user',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async setRole(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body('role') role: string,
  ) {
    return this.usersService.setRole(id, role);
  }

  @Get('check-duplicate')
  @UsersSwagger.checkDuplicate
  async checkDuplicate(@Query('email') email?: string, @Query('username') username?: string) {
    return this.usersService.checkDuplicate({ email, username });
  }

  @Get(':id/activity-logs')
  @UsersSwagger.activityLogs
  @LogAccess()
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Số trang (1-based). Mặc định 1.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số mục trên mỗi trang. Mặc định 20.',
  })
  @ApiOkResponse({
    description:
      'Danh sách activity logs (timeline entries). LƯU Ý: phản hồi là các mục timeline phẳng, không mở rộng per-field diffs (không có change_count/changes[]).',
  })
  async getActivityLogs(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req?: any,
  ) {
    // LogAccessGuard will validate caregiver/admin permissions; allow customers to fetch own logs
    const role = req?.user?.role;
    const requesterId = req?.user?.userId ?? req?.user?.sub;
    if (role === 'admin') return this.usersService.getActivityLogs(id);
    if (!requesterId) throw new Error('User not authenticated');
    if (requesterId === id) return this.usersService.getActivityLogs(id);
    // Otherwise we rely on LogAccessGuard to have validated caregiver/shared-permission
    return this.usersService.getActivityLogs(id);
  }

  @Get(':id/quota')
  @UsersSwagger.getQuota
  async getQuota(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.usersService.getQuota(id);
  }

  @Post(':id/2fa/send')
  @UsersSwagger.send2fa
  @LogActivity({
    action: '2fa_send',
    action_enum: ActivityAction.CREATE,
    message: 'Gửi mã xác thực 2FA',
    resource_type: 'user',
    resource_id: 'id',
    severity: ActivitySeverity.INFO,
  })
  async send2fa(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.usersService.send2fa(id);
  }

  @Post(':id/2fa/verify')
  @UsersSwagger.verify2fa
  @LogActivity({
    action: '2fa_verify',
    action_enum: ActivityAction.UPDATE,
    message: 'Xác thực mã 2FA',
    resource_type: 'user',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async verify2fa(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body('code') code: string,
  ) {
    return this.usersService.verify2fa(id, code);
  }

  @Get(':id/devices')
  @ApiOperation({ summary: 'Lấy danh sách thiết bị của user' })
  @ApiOkResponse({
    description: 'Danh sách thiết bị của user',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              device_id: { type: 'string' },
              platform: { type: 'string' },
              device_name: { type: 'string' },
              last_seen: { type: 'string', format: 'date-time' },
              is_active: { type: 'boolean' },
              fcm_token: { type: 'string' },
            },
          },
        },
        message: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @LogActivity({
    action: 'view_devices',
    resource_type: 'user',
    resource_id: 'id',
    severity: ActivitySeverity.LOW,
  })
  async getUserDevices(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    // Check access permissions
    const requesterId = getUserIdFromReq(req);
    const requesterRole = req.user?.role;

    if (requesterRole === 'customer' && requesterId !== id) {
      throw new BadRequestException('You can only access your own devices');
    }

    // Get FCM tokens for this user (devices)
    const fcmTokens = await this.usersService.getUserFcmTokens(id);

    // Transform to device format
    const devices = fcmTokens.map((token: any) => ({
      device_id: token.device_id,
      platform: token.platform,
      device_name: token.device_name || `Device ${token.platform}`,
      last_seen: token.updated_at,
      is_active: token.is_active,
      fcm_token: token.fcm_token ? token.fcm_token.substring(0, 20) + '...' : 'No token', // Mask token for security
    }));

    return {
      success: true,
      data: devices,
      message: `Found ${devices.length} device(s) for user`,
      timestamp: new Date(),
    };
  }

  // // User-specific alert settings endpoints
  // @Get(':userId/alert-settings')
  // @ApiOperation({ summary: 'Lấy alert settings của user cụ thể' })
  // @ApiOkResponse({ description: 'Alert settings retrieved successfully' })
  // async getUserAlertSettings(@Param('userId') userId: string) {
  //   return this.alertSettingsService.list(userId);
  // }

  // @Post(':userId/alert-settings')
  // @ApiOperation({ summary: 'Lưu batch alert settings cho user' })
  // @ApiOkResponse({ description: 'Alert settings saved successfully' })
  // async saveUserAlertSettings(
  //   @Param('userId') userId: string,
  //   @Body() settings: Record<string, any>,
  // ) {
  //   // For batch save, we'll save each setting individually
  //   const results = [];
  //   for (const [key, value] of Object.entries(settings)) {
  //     try {
  //       const result = await this.alertSettingsService.set(
  //         userId,
  //         key,
  //         String(value),
  //         undefined,
  //         userId,
  //       );
  //       results.push(result);
  //     } catch (error) {
  //       results.push({ key, error: error instanceof Error ? error.message : 'Unknown error' });
  //     }
  //   }

  //   return {
  //     success: true,
  //     data: results,
  //     message: `Batch saved ${results.length} alert settings`,
  //   };
  // }

  // // Camera sync settings endpoint
  // @Post(':userId/camera/sync-settings')
  // @ApiOperation({ summary: 'Sync camera settings cho user' })
  // @ApiOkResponse({ description: 'Camera settings synced successfully' })
  // async syncCameraSettings(@Param('userId') userId: string) {
  //   // This would sync user's settings to their cameras
  //   // For now, return a placeholder response
  //   return {
  //     success: true,
  //     data: {
  //       user_id: userId,
  //       synced_cameras: 0,
  //       timestamp: new Date(),
  //     },
  //     message: 'Camera settings sync initiated',
  //   };
  // }
}
