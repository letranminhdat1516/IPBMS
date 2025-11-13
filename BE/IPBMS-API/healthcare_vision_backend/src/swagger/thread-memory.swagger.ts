import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ThreadMemory } from '../core/entities/thread_memory.entity';
import { CreateThreadMemoryDto } from '../application/dto/thread-memory/create-thread-memory.dto';
import { UpdateThreadMemoryDto } from '../application/dto/thread-memory/update-thread-memory.dto';

export const ThreadMemorySwagger = {
  list: applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách toàn bộ thread memory' }),
    ApiResponse({ status: 200, type: [ThreadMemory] }),
  ),
  detail: applyDecorators(
    ApiOperation({ summary: 'Lấy chi tiết một thread memory theo ID' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({ status: 200, type: ThreadMemory }),
  ),
  create: applyDecorators(
    ApiOperation({ summary: 'Tạo mới một thread memory' }),
    ApiResponse({ status: 201, description: 'Tạo thành công', type: CreateThreadMemoryDto }),
  ),
  update: applyDecorators(
    ApiOperation({ summary: 'Cập nhật một thread memory' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({ status: 200, description: 'Cập nhật thành công', type: UpdateThreadMemoryDto }),
  ),
  delete: applyDecorators(
    ApiOperation({ summary: 'Xoá một thread memory' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({ status: 200, description: 'Xoá thành công' }),
  ),
};
