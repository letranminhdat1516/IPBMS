import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiResponse,
} from '@nestjs/swagger';

export const SnapshotsSwagger = {
  findAll: applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách tất cả snapshot' }),
    ApiOkResponse({
      description: 'Danh sách snapshot',
      schema: {
        example: [
          {
            id: 'uuid-1',
            image_url: 'https://cdn.example.com/snapshots/abc.jpg',
            event_id: 'uuid-evt1',
            created_at: '2025-08-25T10:00:00Z',
          },
        ],
      },
    }),
  ),

  findById: applyDecorators(
    ApiOperation({ summary: 'Lấy snapshot theo ID' }),
    ApiParam({ name: 'id', description: 'Snapshot ID (UUID)', example: 'uuid-1' }),
    ApiOkResponse({
      description: 'Chi tiết snapshot',
      schema: {
        example: {
          id: 'uuid-1',
          image_url: 'https://cdn.example.com/snapshots/abc.jpg',
          event_id: 'uuid-evt1',
          created_at: '2025-08-25T10:00:00Z',
        },
      },
    }),
  ),

  create: applyDecorators(
    ApiOperation({
      summary: 'Tạo snapshot mới kèm nhiều ảnh',
      description:
        'Tạo một snapshot mới. Có thể gửi nhiều file ảnh dưới trường multipart `image_files`. Ảnh sẽ được upload lên Cloudinary và liên kết với snapshot.',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          camera_id: { type: 'string', example: 'uuid-camera' },
          room_id: { type: 'string', example: 'uuid-room' },
          user_id: { type: 'string', example: 'uuid-user' },
          metadata: { type: 'object', example: { source: 'manual', note: 'test snapshot' } },
          capture_type: { type: 'string', example: 'scheduled' },
          captured_at: { type: 'string', format: 'date-time' },
          processed_at: { type: 'string', format: 'date-time' },
          is_processed: { type: 'boolean', example: false },
          image_files: {
            type: 'array',
            items: { type: 'string', format: 'binary' },
            description: "Multipart file field name = 'image_files'. Up to 20 files are accepted.",
          },
        },
        required: ['camera_id', 'room_id'],
      },
    }),
    ApiResponse({ status: 400, description: 'Bad Request - missing or invalid parameters' }),
    ApiResponse({
      status: 403,
      description: 'Forbidden - not allowed to create snapshot for this patient',
    }),
    ApiResponse({ status: 500, description: 'Internal Server Error' }),
    ApiCreatedResponse({
      description: 'Snapshot đã được tạo thành công',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          snapshot: {
            type: 'object',
            properties: {
              snapshot_id: { type: 'string', format: 'uuid' },
              camera_id: { type: 'string', format: 'uuid', nullable: true },
              user_id: { type: 'string', format: 'uuid', nullable: true },
              capture_type: { type: 'string', nullable: true },
              captured_at: { type: 'string', format: 'date-time', nullable: true },
              processed_at: { type: 'string', format: 'date-time', nullable: true },
              cloud_url: { type: 'string', nullable: true },
              image_path: { type: 'string', nullable: true },
            },
          },
        },
        example: {
          message: 'Snapshot created successfully',
          snapshot: {
            snapshot_id: 'snap-1234',
            camera_id: 'uuid-camera',
            user_id: 'uuid-user',
            capture_type: 'alert_triggered',
            captured_at: '2025-11-07T06:00:00.000Z',
            processed_at: '2025-11-07T06:00:01.000Z',
            cloud_url: 'https://res.cloudinary.com/example/image/upload/v1234/abc.jpg',
            image_path: 'example/public_id',
          },
        },
      },
    }),
  ),

  addImages: applyDecorators(
    ApiOperation({ summary: 'Thêm ảnh vào snapshot' }),
    ApiParam({ name: 'id', description: 'Snapshot ID (UUID)', example: 'uuid-1' }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          image_files: {
            type: 'array',
            items: { type: 'string', format: 'binary' },
          },
        },
        required: ['image_files'],
      },
    }),
    ApiOkResponse({
      description: 'Ảnh đã được thêm vào snapshot',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          snapshot: {
            type: 'object',
            properties: {
              snapshot_id: { type: 'string', format: 'uuid' },
              cloud_url: { type: 'string', nullable: true },
              images: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        example: {
          message: 'Added 2 image(s)',
          snapshot: {
            snapshot_id: 'snap-1234',
            cloud_url: 'https://res.cloudinary.com/example/image/upload/v1234/abc.jpg',
            images: ['https://res.cloudinary.com/example/image/upload/v1234/abc1.jpg'],
          },
        },
      },
    }),
  ),

  replaceImages: applyDecorators(
    ApiOperation({ summary: 'Thay toàn bộ ảnh của snapshot' }),
    ApiParam({ name: 'id', description: 'Snapshot ID (UUID)', example: 'uuid-1' }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          image_files: {
            type: 'array',
            items: { type: 'string', format: 'binary' },
          },
        },
        required: ['image_files'],
      },
    }),
    ApiOkResponse({
      description: 'Toàn bộ ảnh đã được thay thế',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          snapshot: {
            type: 'object',
            properties: {
              snapshot_id: { type: 'string', format: 'uuid' },
              images: { type: 'array', items: { type: 'string' } },
              cloud_url: { type: 'string', nullable: true },
            },
          },
        },
        example: {
          message: 'Replaced all images',
          snapshot: {
            snapshot_id: 'snap-1234',
            images: ['https://res.cloudinary.com/example/image/upload/v1234/new1.jpg'],
            cloud_url: 'https://res.cloudinary.com/example/image/upload/v1234/new1.jpg',
          },
        },
      },
    }),
  ),

  removeImage: applyDecorators(
    ApiOperation({ summary: 'Xoá 1 ảnh khỏi snapshot' }),
    ApiParam({ name: 'id', description: 'Snapshot ID (UUID)', example: 'uuid-1' }),
    ApiParam({ name: 'image_id', description: 'Image ID (UUID)', example: 'uuid-img1' }),
    ApiOkResponse({
      description: 'Ảnh đã được xoá',
      schema: { example: { message: 'Image deleted' } },
    }),
  ),

  remove: applyDecorators(
    ApiOperation({ summary: 'Xoá snapshot (bao gồm ảnh Cloudinary)' }),
    ApiParam({ name: 'id', description: 'Snapshot ID (UUID)', example: 'uuid-1' }),
    ApiOkResponse({
      description: 'Snapshot đã được xoá',
      schema: { example: { message: 'Snapshot deleted successfully' } },
    }),
  ),
};
