import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateCameraDto } from '../application/dto/cameras/create-camera.dto';
import { UpdateCameraDto } from '../application/dto/cameras/update-camera.dto';

export const CamerasSwagger = {
  list: applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách toàn bộ camera' }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 20 }),
    ApiQuery({ name: 'reportedOnly', required: false, example: false }),
    ApiOkResponse({
      description: 'Danh sách camera',
      schema: {
        example: {
          items: [{ camera_id: 'uuid', user_id: 'uuid', name: 'Camera 1' }],
          total: 2,
          page: 1,
          limit: 20,
        },
      },
    }),
  ),

  listByUser: applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách camera theo user_id' }),
    ApiParam({ name: 'user_id', description: 'User UUID', format: 'uuid' }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 20 }),
    ApiOkResponse({
      description: 'Danh sách camera theo user',
      schema: {
        example: {
          items: [{ camera_id: 'uuid', user_id: 'uuid', name: 'Camera 1' }],
          total: 2,
          page: 1,
          limit: 20,
        },
      },
    }),
  ),

  getById: applyDecorators(
    ApiOperation({ summary: 'Lấy chi tiết camera theo ID' }),
    ApiParam({ name: 'camera_id', description: 'Camera UUID', format: 'uuid' }),
    ApiOkResponse({
      description: 'Chi tiết camera',
      schema: {
        example: {
          camera_id: 'uuid',
          user_id: 'uuid',
          name: 'Camera 1',
        },
      },
    }),
  ),

  create: applyDecorators(
    ApiOperation({ summary: 'Tạo mới một camera' }),
    ApiBody({ type: CreateCameraDto, description: 'Thông tin camera cần tạo' }),
    ApiResponse({
      status: 201,
      description: 'Tạo thành công',
      schema: {
        example: {
          camera_id: 'uuid',
          user_id: 'uuid',
          name: 'Camera 1',
        },
      },
    }),
  ),

  update: applyDecorators(
    ApiOperation({ summary: 'Cập nhật thông tin camera' }),
    ApiParam({ name: 'camera_id', description: 'Camera UUID', format: 'uuid' }),
    ApiBody({ type: UpdateCameraDto, description: 'Thông tin camera cần cập nhật' }),
    ApiOkResponse({
      description: 'Cập nhật thành công',
      schema: {
        example: {
          camera_id: 'uuid',
          user_id: 'uuid',
          name: 'Updated Camera',
        },
      },
    }),
  ),

  delete: applyDecorators(
    ApiOperation({ summary: 'Xoá một camera theo ID' }),
    ApiParam({ name: 'camera_id', description: 'Camera UUID', format: 'uuid' }),
    ApiOkResponse({
      description: 'Kết quả xoá camera',
      schema: {
        example: { success: true },
      },
    }),
  ),

  events: applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách sự kiện của camera' }),
    ApiParam({ name: 'camera_id', description: 'Camera UUID', format: 'uuid' }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 50 }),
    ApiQuery({ name: 'dateFrom', required: false }),
    ApiQuery({ name: 'dateTo', required: false }),
    ApiQuery({ name: 'status', required: false, description: 'comma list' }),
    ApiQuery({ name: 'type', required: false, description: 'comma list' }),
    ApiQuery({ name: 'severity', required: false, description: 'comma list' }),
    ApiQuery({ name: 'orderBy', required: false, example: 'detected_at' }),
    ApiQuery({ name: 'order', required: false, example: 'DESC' }),
    ApiOkResponse({
      description: 'Danh sách sự kiện',
      schema: {
        example: {
          items: [{ event_id: 'uuid', camera_id: 'uuid', status: 'detected' }],
          total: 10,
          page: 1,
          limit: 50,
        },
      },
    }),
  ),
};
