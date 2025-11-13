import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import {
  BulkTokenDto,
  SaveTokenDto,
  SendToUserDto,
  SendToUsersDto,
  ActorMessageDto,
  SystemEventDto,
} from '../application/dto/fcm/fcm.dto';

export const FcmSwagger = {
  saveBulk: applyDecorators(
    ApiOperation({ summary: 'Lưu nhiều FCM tokens (bulk) cho user' }),
    ApiBody({ type: BulkTokenDto }),
    ApiResponse({ status: 200, schema: { example: { success: true } } }),
  ),

  updateAudience: applyDecorators(
    ApiOperation({ summary: 'Cập nhật audience cho tất cả tokens của một user' }),
    ApiParam({
      name: 'userId',
      description: 'UUID của user',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiResponse({ status: 200, schema: { example: { success: true, updatedTokens: 3 } } }),
  ),

  saveToken: applyDecorators(
    ApiOperation({ summary: 'Lưu một FCM token cho user' }),
    ApiBody({ type: SaveTokenDto }),
    ApiResponse({ status: 200, schema: { example: { success: true, tokenId: 'token-uuid' } } }),
  ),

  getTokens: applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách FCM tokens của user' }),
    ApiParam({ name: 'userId', required: false, description: 'UUID của user (query param)' }),
    ApiResponse({ status: 200, schema: { example: [] } }),
  ),

  tokenCheck: applyDecorators(
    ApiOperation({ summary: 'Kiểm tra token tồn tại cho user' }),
    ApiParam({ name: 'userId', required: true, description: 'UUID của user' }),
    ApiParam({ name: 'token', required: true, description: 'FCM token' }),
    ApiResponse({ status: 200, schema: { example: { exists: true, tokenId: 'token-uuid' } } }),
  ),

  sendToUser: applyDecorators(
    ApiOperation({ summary: 'Gửi thông báo tới một user (admin)' }),
    ApiParam({ name: 'userId', description: 'UUID của user nhận' }),
    ApiBody({ type: SendToUserDto }),
    ApiResponse({ status: 200, schema: { example: { successCount: 1, failureCount: 0 } } }),
  ),

  sendToUsers: applyDecorators(
    ApiOperation({ summary: 'Gửi thông báo tới nhiều users (bulk, admin)' }),
    ApiBody({ type: SendToUsersDto }),
    ApiResponse({ status: 200, schema: { example: { totalSuccess: 10, totalFailure: 0 } } }),
  ),

  pushActorMessage: applyDecorators(
    ApiOperation({ summary: 'Gửi tin nhắn giữa Customer ↔ Caregiver (actor message)' }),
    ApiBody({ type: ActorMessageDto }),
    ApiResponse({ status: 200, schema: { example: { successCount: 2, failureCount: 0 } } }),
  ),

  pushSystemEvent: applyDecorators(
    ApiOperation({ summary: 'Gửi system event (AI) tới customer và caregivers (admin)' }),
    ApiBody({ type: SystemEventDto }),
    ApiResponse({ status: 200, schema: { example: { successCount: 3, failureCount: 0 } } }),
  ),
};
