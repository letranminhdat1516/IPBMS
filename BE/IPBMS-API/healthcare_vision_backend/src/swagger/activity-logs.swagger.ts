import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ActivityLog } from '../core/entities/activity_logs.entity';
import { CreateActivityLogDto } from '../application/dto/activity-logs/create-activity-log.dto';
import { UpdateActivityLogDto } from '../application/dto/activity-logs/update-activity-log.dto';

export const ActivityLogsSwagger = {
  list: applyDecorators(
    ApiOperation({
      summary: 'Lấy tất cả activity logs',
      description:
        'Trả về các entry của activity log (summary list). Lưu ý: đây là các log dạng bản ghi sự kiện/hoạt động — không phải audit history với per-field diffs. Các entry không chứa `change_count` hoặc mảng `changes[]`.',
    }),
    ApiOkResponse({ type: ActivityLog, isArray: true }),
  ),

  getById: applyDecorators(
    ApiOperation({ summary: 'Lấy activity log theo ID' }),
    ApiOkResponse({ type: ActivityLog }),
  ),

  getByUserId: applyDecorators(
    ApiOperation({ summary: 'Lấy activity logs theo user ID' }),
    ApiOkResponse({ type: ActivityLog, isArray: true }),
  ),

  create: applyDecorators(
    ApiOperation({ summary: 'Tạo activity log mới' }),
    ApiOkResponse({ type: CreateActivityLogDto }),
  ),

  update: applyDecorators(
    ApiOperation({ summary: 'Cập nhật activity log theo ID' }),
    ApiOkResponse({ type: UpdateActivityLogDto }),
  ),

  delete: applyDecorators(
    ApiOperation({ summary: 'Xóa activity log theo ID' }),
    ApiOkResponse({ type: String, description: 'Xóa thành công' }),
  ),
};
