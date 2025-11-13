import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { AiConfiguration } from '../core/entities/ai_configurations.entity';
import { CreateAiConfigurationDto } from '../application/dto/ai-configurations/create-ai-configuration.dto';
import { UpdateAiConfigurationDto } from '../application/dto/ai-configurations/update-ai-configuration.dto';

export const AiConfigurationsSwagger = {
  list: applyDecorators(
    ApiOperation({ summary: 'Lấy tất cả cấu hình AI của hệ thống' }),
    ApiOkResponse({ type: AiConfiguration, isArray: true }),
  ),

  getById: applyDecorators(
    ApiOperation({ summary: 'Lấy cấu hình AI theo ID' }),
    ApiParam({ name: 'id', description: 'UUID của cấu hình AI' }),
    ApiOkResponse({ type: AiConfiguration }),
  ),

  create: applyDecorators(
    ApiOperation({ summary: 'Tạo cấu hình AI mới' }),
    ApiBody({ type: CreateAiConfigurationDto }),
    ApiOkResponse({ description: 'Tạo cấu hình AI thành công' }),
  ),

  update: applyDecorators(
    ApiOperation({ summary: 'Cập nhật cấu hình AI theo ID' }),
    ApiParam({ name: 'id', description: 'UUID của cấu hình AI' }),
    ApiBody({ type: UpdateAiConfigurationDto }),
    ApiOkResponse({ description: 'Cập nhật cấu hình AI thành công' }),
  ),

  delete: applyDecorators(
    ApiOperation({ summary: 'Xóa cấu hình AI theo ID' }),
    ApiParam({ name: 'id', description: 'UUID của cấu hình AI' }),
    ApiOkResponse({ description: 'Xóa cấu hình AI thành công' }),
  ),
};
