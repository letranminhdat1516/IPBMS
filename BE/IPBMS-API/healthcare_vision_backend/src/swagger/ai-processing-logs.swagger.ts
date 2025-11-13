import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { AiProcessingLog } from '../core/entities/ai_processing_logs.entity';
import { CreateAiProcessingLogDto } from '../application/dto/ai-processing-logs/create-ai-processing-log.dto';
import { UpdateAiProcessingLogDto } from '../application/dto/ai-processing-logs/update-ai-processing-log.dto';

export const AiProcessingLogsSwagger = {
  list: applyDecorators(
    ApiOperation({ summary: 'Lấy tất cả log xử lý AI' }),
    ApiOkResponse({ type: AiProcessingLog, isArray: true }),
  ),

  getById: applyDecorators(
    ApiOperation({ summary: 'Lấy log xử lý AI theo ID' }),
    ApiParam({ name: 'id', description: 'UUID của log' }),
    ApiOkResponse({ type: AiProcessingLog }),
  ),

  create: applyDecorators(
    ApiOperation({ summary: 'Tạo mới log xử lý AI' }),
    ApiBody({ type: CreateAiProcessingLogDto }),
    ApiOkResponse({ description: 'Tạo log thành công' }),
  ),

  update: applyDecorators(
    ApiOperation({ summary: 'Cập nhật log xử lý AI theo ID' }),
    ApiParam({ name: 'id', description: 'UUID của log' }),
    ApiBody({ type: UpdateAiProcessingLogDto }),
    ApiOkResponse({ description: 'Cập nhật log thành công' }),
  ),

  delete: applyDecorators(
    ApiOperation({ summary: 'Xóa log xử lý AI theo ID' }),
    ApiParam({ name: 'id', description: 'UUID của log' }),
    ApiOkResponse({ description: 'Xóa log thành công' }),
  ),
};
