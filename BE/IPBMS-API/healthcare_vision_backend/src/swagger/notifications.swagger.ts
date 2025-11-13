import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CreateNotificationDto } from '../application/dto/notifications/create-notification.dto';
import { UpdateNotificationDto } from '../application/dto/notifications/update-notification.dto';

export const NotificationsSwagger = {
  findAll: applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách tất cả thông báo với phân trang' }),
    ApiResponse({
      status: 200,
      schema: {
        example: {
          data: [
            {
              notification_id: 'uuid',
              title: 'Nhắc nhở uống thuốc',
              message: 'Đến giờ uống thuốc',
              created_at: '2025-08-25T12:00:00Z',
            },
          ],
          total: 100,
          page: 1,
          limit: 10,
        },
      },
    }),
  ),

  findById: applyDecorators(
    ApiOperation({ summary: 'Lấy thông báo theo ID' }),
    ApiParam({ name: 'id', description: 'ID thông báo', example: 'uuid' }),
    ApiResponse({
      status: 200,
      schema: {
        example: {
          id: 'uuid',
          title: 'Nhắc nhở uống thuốc',
          message: 'Đến giờ uống thuốc',
          created_at: '2025-08-25T12:00:00Z',
        },
      },
    }),
  ),

  create: applyDecorators(
    ApiOperation({ summary: 'Tạo thông báo mới' }),
    ApiBody({ type: CreateNotificationDto }),
    ApiResponse({
      status: 201,
      schema: {
        example: { message: 'Tạo thông báo thành công' },
      },
    }),
  ),

  update: applyDecorators(
    ApiOperation({ summary: 'Cập nhật thông báo' }),
    ApiParam({ name: 'id', description: 'ID thông báo', example: 'uuid' }),
    ApiBody({ type: UpdateNotificationDto }),
    ApiResponse({
      status: 200,
      schema: {
        example: { message: 'Cập nhật thông báo thành công' },
      },
    }),
  ),

  remove: applyDecorators(
    ApiOperation({ summary: 'Xoá thông báo' }),
    ApiParam({ name: 'id', description: 'ID thông báo', example: 'uuid' }),
    ApiResponse({
      status: 200,
      schema: {
        example: { message: 'Xoá thông báo thành công' },
      },
    }),
  ),

  markAsRead: applyDecorators(
    ApiOperation({ summary: 'Đánh dấu thông báo đã đọc' }),
    ApiParam({ name: 'id', description: 'ID thông báo', example: 'uuid' }),
    ApiResponse({
      status: 200,
      schema: {
        example: { message: 'Đánh dấu thông báo đã đọc thành công' },
      },
    }),
  ),

  markBulkAsRead: applyDecorators(
    ApiOperation({ summary: 'Đánh dấu nhiều thông báo đã đọc' }),
    ApiBody({
      schema: {
        example: {
          notificationIds: ['uuid1', 'uuid2', 'uuid3'],
        },
      },
    }),
    ApiResponse({
      status: 200,
      schema: {
        example: { message: 'Đánh dấu thông báo đã đọc thành công' },
      },
    }),
  ),
  markAllRead: applyDecorators(
    ApiOperation({ summary: 'Đánh dấu tất cả thông báo của user là đã đọc' }),
    ApiResponse({
      status: 200,
      schema: {
        example: { message: 'Đánh dấu thông báo đã đọc thành công', updatedCount: 5 },
      },
    }),
  ),
};
