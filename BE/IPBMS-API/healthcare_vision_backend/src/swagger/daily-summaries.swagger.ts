import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { DailySummary } from '../core/entities/daily_summaries.entity';
import { CreateDailySummaryDto } from '../application/dto/daily-summaries/create-daily-summary.dto';
import { UpdateDailySummaryDto } from '../application/dto/daily-summaries/update-daily-summary.dto';

export const DailySummariesSwagger = {
  list: applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách daily summaries' }),
    ApiOkResponse({ type: DailySummary, isArray: true }),
  ),

  findById: applyDecorators(
    ApiOperation({ summary: 'Lấy daily summary theo ID' }),
    ApiParam({ name: 'id', description: 'UUID của daily summary' }),
    ApiOkResponse({ type: DailySummary }),
  ),

  create: applyDecorators(
    ApiOperation({ summary: 'Tạo mới daily summary' }),
    ApiBody({ type: CreateDailySummaryDto }),
    ApiCreatedResponse({ description: 'Daily summary created successfully' }),
  ),

  update: applyDecorators(
    ApiOperation({ summary: 'Cập nhật daily summary theo ID' }),
    ApiParam({ name: 'id', description: 'UUID của daily summary' }),
    ApiBody({ type: UpdateDailySummaryDto }),
    ApiOkResponse({ description: 'Daily summary updated successfully' }),
  ),

  remove: applyDecorators(
    ApiOperation({ summary: 'Xóa daily summary theo ID' }),
    ApiParam({ name: 'id', description: 'UUID của daily summary' }),
    ApiOkResponse({ description: 'Daily summary deleted successfully' }),
  ),
};
