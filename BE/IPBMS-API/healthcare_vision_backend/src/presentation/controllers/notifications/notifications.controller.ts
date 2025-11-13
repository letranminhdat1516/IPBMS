import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { createBadRequestException, createForbiddenException } from '../../../shared/utils';
import { CreateNotificationDto } from '../../../application/dto/notifications/create-notification.dto';
import { UpdateNotificationDto } from '../../../application/dto/notifications/update-notification.dto';
import { NotificationLogsService } from '../../../application/services/notification-logs.service';
import { NotificationsService } from '../../../application/services/notifications.service';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
// ...existing code...
import { Notification } from '../../../core/entities/notifications.entity';
import { PaginateOptions, PaginateResult } from '../../../core/types/paginate.types';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { NotificationsSwagger } from '../../../swagger/notifications.swagger';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly _service: NotificationsService,
    private readonly _notificationLogsService: NotificationLogsService,
  ) {}

  @Get()
  @NotificationsSwagger.findAll
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginateResult<Notification>> {
    const options: PaginateOptions = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };

    // Determine requester id from JWT payload. Some guards set `user.user_id` or `user.userId`.
    const requesterId: string | undefined = req?.user?.user_id ?? req?.user?.userId;
    const role: string | undefined = req?.user?.role || req?.user?.roles || req?.user?.role_name;

    // If requester is not admin, restrict notifications to their own user_id
    if (requesterId && role !== 'admin') {
      options.where = { user_id: requesterId } as any;
    }

    return this._service.paginateDynamic(options);
  }

  @Get('unread-count')
  @NotificationsSwagger.findAll
  async unreadCount(
    @Req() req: any,
    @Query('user_id') user_id?: string,
  ): Promise<{ unread: number }> {
    // Determine requester id from JWT payload. Some guards set `user.user_id` or `user.userId`.
    const requesterId: string | undefined = req?.user?.user_id ?? req?.user?.userId;
    const role: string | undefined = req?.user?.role || req?.user?.roles || req?.user?.role_name;

    // Validate optional UUID v4 manually to avoid throwing 400 via ParseUUIDPipe on query params
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const uid = user_id && uuidV4Regex.test(user_id) ? user_id : undefined;

    // Use authenticated user if no user_id provided, or if user is not admin
    let targetUserId = uid;
    if (!targetUserId || role !== 'admin') {
      targetUserId = requesterId;
    }

    const count = await this._service.countUnread(targetUserId);
    return { unread: count };
  }

  @Get(':id')
  @NotificationsSwagger.findById
  async findById(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<Notification> {
    const notification = await this._service.findById(id);

    const requesterId: string | undefined = req?.user?.user_id ?? req?.user?.userId;
    const role: string | undefined = req?.user?.role || req?.user?.roles || req?.user?.role_name;

    // Non-admins may only access their own notifications
    if (role !== 'admin') {
      if (!requesterId) throw createBadRequestException('Thiếu ID người yêu cầu');
      if (notification.user_id !== requesterId)
        throw createForbiddenException('Không có quyền truy cập');
    }

    return notification;
  }

  @Post()
  @NotificationsSwagger.create
  @LogActivity({
    action: 'create_notification',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo notification mới',
    resource_type: 'notification',
    resource_name: 'notification',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async create(@Body() data: CreateNotificationDto) {
    const created = await this._service.create(data as any);
    return { message: 'Tạo thông báo thành công', data: created };
  }

  @Patch('mark-all-read')
  async markAllRead(@Req() req: any, @Query('user_id') user_id?: string) {
    const requesterId: string | undefined = req?.user?.user_id ?? req?.user?.userId;
    const role: string | undefined = req?.user?.role || req?.user?.roles || req?.user?.role_name;

    // Validate optional user_id manually (avoid ParseUUIDPipe on query string)
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const uid = user_id && uuidV4Regex.test(user_id) ? user_id : undefined;

    // Non-admins must only mark their own notifications
    if (role !== 'admin') {
      if (uid && uid !== requesterId) throw createForbiddenException('Không có quyền truy cập');
      if (!requesterId) throw createBadRequestException('Thiếu ID người yêu cầu');
    }

    const targetUserId = role === 'admin' ? uid || requesterId : requesterId!;
    if (!targetUserId) throw new BadRequestException('Chưa chỉ định người dùng đích');

    const updatedCount = await this._service.markAllAsRead(targetUserId);
    return { message: 'Notifications marked as read successfully', updatedCount };
  }

  @Patch(':id')
  @NotificationsSwagger.update
  @LogActivity({
    action: 'update_notification',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật notification',
    resource_type: 'notification',
    resource_name: 'notification',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async update(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() data: UpdateNotificationDto,
  ) {
    const notification = await this._service.findById(id);

    const requesterId: string | undefined = req?.user?.user_id ?? req?.user?.userId;
    const role: string | undefined = req?.user?.role || req?.user?.roles || req?.user?.role_name;

    if (role !== 'admin') {
      if (!requesterId) throw createBadRequestException('Thiếu ID người yêu cầu');
      if (notification.user_id !== requesterId)
        throw createForbiddenException('Không có quyền truy cập');
    }

    await this._service.update(id, data);
    return { message: 'Cập nhật thông báo thành công' };
  }
}
