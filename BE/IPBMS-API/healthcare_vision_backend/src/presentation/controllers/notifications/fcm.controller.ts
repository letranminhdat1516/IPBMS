import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ActorMessageDto,
  BulkTokenDto,
  DeleteTokenDto,
  SaveTokenDto,
  SendNotificationResponseDto,
  SendToUserDto,
  SendToUsersDto,
  SendToUsersResponseDto,
  SystemEventDto,
  UpdateTokenDto,
} from '../../../application/dto/fcm/fcm.dto';
import { FcmSwagger } from '../../../swagger/fcm.swagger';
import { FcmService } from '../../../application/services/fcm.service';
import { FcmTokenService } from '../../../application/services/fcm/fcm.token.service';
import { CaregiverInvitationsService } from '../../../application/services/users';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { FcmToken } from '../../../core/entities/fcm-token.entity';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { Public } from '../../../shared/decorators/public.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { ModerateRateLimit } from '../../../shared/guards/rate-limit.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { AuthenticatedRequest } from '../../../shared/types/auth.types';
import { createBadRequestException, createForbiddenException } from '../../../shared/utils';
import { timeUtils } from '../../../shared/constants/time.constants';
import {
  extractRoles,
  getRequesterId,
  sanitizeRecipients,
} from '../../../shared/utils/fcm.helpers';
import { isValidUuid } from '../../../shared/utils/uuid.util';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';

@ApiTags('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fcm')
export class FcmController {
  private readonly logger = new Logger(FcmController.name);
  constructor(
    private readonly _fcmService: FcmService,
    private readonly _assignmentsService: CaregiverInvitationsService,
    private readonly _fcmTokenService: FcmTokenService,
  ) {
    void this._fcmService;
    void this._assignmentsService;
    void this._fcmTokenService;
  }

  private assertSelfOrAdmin(req: AuthenticatedRequest, targetUserId: string) {
    const requesterId = getRequesterId(req);
    const roles = extractRoles(req);
    const isAdmin = roles.includes('admin');
    if (!isAdmin && requesterId !== targetUserId) {
      throw createForbiddenException(
        'Bạn chỉ có thể thao tác trên tài khoản của chính mình',
        'FORBIDDEN_SELF_ONLY',
      );
    }
  }

  @Public()
  @ApiBearerAuth()
  @ApiOperation({
    summary: '🔄 Lưu nhiều FCM tokens sau đăng nhập',
    description: `
## 🎯 Mục đích
Lưu bulk FCM tokens cho user sau khi đăng nhập thành công.

## 📋 Thông tin cần thiết
- **userId**: UUID của user (bắt buộc)
- **device**: Array tokens của thiết bị mobile
- **caregiver**: Array tokens cho vai trò caregiver
- **emergency**: Array tokens cho trường hợp khẩn cấp
- **customer**: Array tokens cho vai trò customer

## 🔧 Cách sử dụng
\`\`\`bash
curl -X POST http://localhost:3010/api/fcm/token/bulk \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "device": ["fcm-token-device-1", "fcm-token-device-2"],
    "caregiver": ["fcm-token-caregiver-1"],
    "customer": ["fcm-token-customer-1"]
  }'
\`\`\`

## ✅ Kết quả thành công
\`\`\`json
{
  "success": true
}
\`\`\`
    `,
  })
  @ApiBody({ type: BulkTokenDto })
  @ApiOkResponse({
    description: 'Tokens đã được lưu thành công',
    schema: {
      example: {
        success: true,
        message: 'Successfully saved 4 tokens for user 550e8400-e29b-41d4-a716-446655440000',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu đầu vào không hợp lệ',
    schema: {
      example: {
        statusCode: 400,
        message: ['userId phải là UUID hợp lệ', 'device phải là một mảng các chuỗi'],
        error: 'Bad Request',
      },
    },
  })
  @FcmSwagger.saveBulk
  @Post('token/bulk')
  @LogActivity({
    action: 'save_tokens_bulk',
    action_enum: ActivityAction.CREATE,
    message: 'Lưu nhiều FCM tokens sau đăng nhập',
    resource_type: 'fcm',
    resource_name: 'token_bulk',
    resource_id: 'dto.userId',
    severity: ActivitySeverity.INFO,
  })
  async saveBulkFcmToken(
    @Body(new ValidationPipe({ whitelist: true })) dto: BulkTokenDto,
    @Req() _req: AuthenticatedRequest,
  ) {
    await this._fcmService.saveAllTokensAfterLogin(dto.userId, {
      device: dto.device,
      caregiver: dto.caregiver,
      emergency: dto.emergency,
      customer: dto.customer,
    });
    return { success: true };
  }

  @Public()
  @ApiBearerAuth()
  @ApiOperation({
    summary: '🔄 Cập nhật audience của tất cả tokens',
    description: `
## 🎯 Mục đích
Cập nhật audience của tất cả FCM tokens hiện có dựa trên vai trò hiện tại của user.

## 📋 Khi nào cần sử dụng
- Khi user thay đổi vai trò (từ customer thành caregiver hoặc ngược lại)
- Khi cần đồng bộ lại audience của tất cả tokens
- Sau khi migrate dữ liệu user

## 🔧 Cách sử dụng
\`\`\`bash
curl -X POST http://localhost:3010/api/fcm/token/update-audience/550e8400-e29b-41d4-a716-446655440000
\`\`\`

## ✅ Kết quả thành công
\`\`\`json
{
  "success": true,
  "updatedTokens": 3,
  "message": "Successfully updated audience for 3 tokens"
}
\`\`\`
    `,
  })
  @ApiParam({
    name: 'userId',
    description: 'UUID của user cần cập nhật audience',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Cập nhật audience thành công',
    schema: {
      example: {
        success: true,
        updatedTokens: 3,
        message: 'Successfully updated audience for 3 tokens',
      },
    },
  })
  @Post('token/update-audience/:userId')
  @LogActivity({
    action: 'update_tokens_audience',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật audience cho tất cả tokens của user',
    resource_type: 'fcm',
    resource_name: 'update_audience',
    resource_id: 'userId',
    severity: ActivitySeverity.INFO,
  })
  async updateTokensAudience(@Param('userId') userId: string, @Req() req: AuthenticatedRequest) {
    if (!userId) throw createBadRequestException('Trường userId là bắt buộc');
    if (!isValidUuid(userId)) throw createBadRequestException('userId phải là UUID hợp lệ');
    this.assertSelfOrAdmin(req, userId);
    await this._fcmService.updateExistingTokensAudience(userId);
    return { success: true };
  }

  @Public()
  @ApiBearerAuth()
  @ApiOperation({
    summary: '💾 Lưu một FCM token',
    description: `
## 🎯 Mục đích
Lưu một FCM token cụ thể cho user với thông tin chi tiết.

## 📋 Thông tin cần thiết
- **userId**: UUID của user (bắt buộc)
- **token**: FCM token từ mobile app (bắt buộc)
- **type**: Loại token - 'device', 'caregiver', 'emergency', 'customer' (bắt buộc)
- **platform**: Platform - 'android', 'ios', 'web' (tùy chọn)
- **deviceId**: ID của thiết bị (tùy chọn)
    `,
  })
  @ApiBody({ type: SaveTokenDto })
  @ApiOkResponse({
    description: 'Token đã được lưu thành công',
    schema: {
      example: {
        success: true,
        tokenId: '550e8400-e29b-41d4-a716-446655440001',
        message: 'Token saved successfully',
      },
    },
  })
  @Post('token')
  @LogActivity({
    action: 'save_token',
    action_enum: ActivityAction.CREATE,
    message: 'Lưu FCM token',
    resource_type: 'fcm',
    resource_name: 'token',
    resource_id: 'dto.userId',
    severity: ActivitySeverity.INFO,
  })
  async saveFcmToken(
    @Body(new ValidationPipe({ whitelist: true })) dto: SaveTokenDto,
    @Req() _req: AuthenticatedRequest,
  ) {
    // Log incoming save request but mask token to avoid sensitive data leakage
    try {
      const t = String(dto.token || '').trim();
      const masked = t ? `${t.substring(0, 10)}…(${t.length})` : 'EMPTY';
      this.logger.log(
        `📥 [FCM_TOKEN_INCOMING] user=${dto.userId} device=${dto.deviceId || 'unknown'} token=${masked}`,
      );
    } catch {
      // ignore logging errors
    }

    await this._fcmService.saveToken(dto.userId, dto.token, dto.type, dto.platform, dto.deviceId);
    return { success: true };
  }

  @Public()
  @ApiBearerAuth()
  @ApiOperation({
    summary: '📋 Lấy danh sách FCM tokens',
    description: `
## 🎯 Mục đích
Lấy danh sách tất cả FCM tokens của một user với tùy chọn lọc.
    `,
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'UUID của user cần lấy tokens',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'deviceId',
    required: false,
    description: 'Lọc theo device ID cụ thể (tùy chọn)',
    example: 'device-123',
  })
  @ApiOkResponse({
    description: 'Danh sách tokens của user',
    schema: {
      example: [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          userId: '550e8400-e29b-41d4-a716-446655440000',
          token: 'fcm_token_abc123',
          deviceId: 'device-123',
          platform: 'android',
          type: 'device',
          isActive: true,
          createdAt: '2025-10-15T12:34:56.000Z',
          lastUsedAt: '2025-10-15T12:40:00.000Z',
        },
      ],
    },
  })
  @Get('tokens')
  async getTokens(
    @Query('userId') userId: string,
    @Req() _req: AuthenticatedRequest,
    @Query('deviceId') deviceId?: string,
  ) {
    if (!userId) throw createBadRequestException('Trường userId là bắt buộc');
    if (!isValidUuid(userId)) throw createBadRequestException('userId phải là UUID hợp lệ');
    return this._fcmService.getTokens(userId, deviceId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: '👥 Lấy FCM tokens của partners',
    description: `
Lấy FCM tokens của caregiver (nếu user hiện tại là customer) hoặc customer (nếu user hiện tại là caregiver) dựa trên assignments đang active.
    `,
  })
  @ApiQuery({
    name: 'partnerId',
    required: false,
    description: 'ID của partner cụ thể (tùy chọn)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'deviceId',
    required: false,
    description: 'ID của device cụ thể (tùy chọn)',
    example: 'device-123',
  })
  @ApiOkResponse({ description: 'Danh sách FCM tokens của partners' })
  @Get('tokens/partners')
  async getPartnerTokens(
    @Req() req: AuthenticatedRequest,
    @Query('partnerId') partnerId?: string,
    @Query('deviceId') deviceId?: string,
  ) {
    const requesterId = getRequesterId(req);
    if (!requesterId) {
      throw createBadRequestException('Người dùng chưa đăng nhập');
    }
    const roles = extractRoles(req);
    const isCustomer = roles.includes('customer');
    const isCaregiver = roles.includes('caregiver');
    if (!isCustomer && !isCaregiver) {
      throw createForbiddenException('Chỉ customer và caregiver mới có thể truy cập endpoint này');
    }
    let partnerUserIds: string[] = [];
    if (partnerId) {
      if (isCustomer) {
        const caregivers = await this._assignmentsService.listCaregiversOfCustomer(
          requesterId,
          undefined,
        );
        const isValidPartner = caregivers.some((cg) => cg.caregiver_id === partnerId);
        if (!isValidPartner) {
          throw createForbiddenException('Partner ID không hợp lệ hoặc không có assignment');
        }
      } else if (isCaregiver) {
        const customers = await this._assignmentsService.listCustomersOfCaregiver(
          requesterId,
          undefined,
        );
        const isValidPartner = customers.some((cust) => cust.customer_id === partnerId);
        if (!isValidPartner) {
          throw createForbiddenException('Partner ID không hợp lệ hoặc không có assignment');
        }
      }
      partnerUserIds = [partnerId];
    } else {
      if (isCustomer) {
        const caregivers = await this._assignmentsService.listCaregiversOfCustomer(
          requesterId,
          undefined,
        );
        partnerUserIds = caregivers.map((cg) => cg.caregiver_id);
      } else if (isCaregiver) {
        const customers = await this._assignmentsService.listCustomersOfCaregiver(
          requesterId,
          undefined,
        );
        partnerUserIds = customers.map((cust) => cust.customer_id);
      }
    }
    if (partnerUserIds.length === 0) {
      return [];
    }
    const allTokens = [];
    for (const partnerUserId of partnerUserIds) {
      const tokens = await this._fcmService.getTokens(partnerUserId, deviceId);
      allTokens.push(...tokens);
    }
    return allTokens;
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Xóa FCM token',
    description: 'Xóa FCM token của user. Chỉ admin hoặc chính user đó mới có thể thực hiện.',
  })
  @ApiBody({ type: DeleteTokenDto })
  @ApiOkResponse({
    description: 'Token đã được xóa thành công',
    schema: { example: { success: true } },
  })
  @Delete('token')
  @LogActivity({
    action: 'delete_token',
    action_enum: ActivityAction.DELETE,
    message: 'Xóa FCM token của user',
    resource_type: 'fcm',
    resource_name: 'token',
    resource_id: 'dto.userId',
    severity: ActivitySeverity.MEDIUM,
  })
  async deleteToken(
    @Body(new ValidationPipe({ whitelist: true })) dto: DeleteTokenDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const resolvedUserId = dto.userId || getUserIdFromReq(req);
    if (!resolvedUserId) throw createBadRequestException('Người dùng chưa đăng nhập');
    this.assertSelfOrAdmin(req, resolvedUserId);
    await this._fcmService.deleteToken(resolvedUserId, dto.token);
    return { success: true };
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Kiểm tra token đã tồn tại chưa',
    description:
      'Kiểm tra xem FCM token có tồn tại cho user không. Chỉ admin hoặc chính user đó mới có thể kiểm tra.',
  })
  @ApiQuery({ name: 'userId', required: true, description: 'UUID của user' })
  @ApiQuery({ name: 'token', required: true, description: 'FCM token cần kiểm tra' })
  @ApiOkResponse({
    description: 'Kết quả kiểm tra',
    schema: { example: { exists: true, tokenId: 'token-uuid' } },
  })
  @Get('token/check')
  async checkToken(
    @Query('userId') userId: string,
    @Query('token') token: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!userId) throw createBadRequestException('Trường userId là bắt buộc');
    if (!isValidUuid(userId)) throw createBadRequestException('userId phải là UUID hợp lệ');
    this.assertSelfOrAdmin(req, userId);
    return this._fcmService.checkToken(userId, token);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy FCM token của user hiện tại từ JWT',
    description: 'Lấy danh sách FCM tokens của user hiện tại (từ JWT token).',
  })
  @ApiOkResponse({
    description: 'Danh sách tokens của user hiện tại',
    schema: {
      example: [
        {
          id: 'token-uuid',
          token: 'fcm-token-string',
          type: 'device',
          platform: 'android',
          isActive: true,
        },
      ],
    },
  })
  @Get('my-tokens')
  async getMyTokens(@Req() req: AuthenticatedRequest) {
    const userId = getUserIdFromReq(req);
    if (!userId) throw createBadRequestException('Người dùng chưa đăng nhập');
    return this._fcmService.getTokens(userId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật FCM token',
    description:
      'Cập nhật FCM token cũ thành token mới. Chỉ admin hoặc chính user đó mới có thể thực hiện.',
  })
  @ApiBody({ type: UpdateTokenDto })
  @ApiOkResponse({
    description: 'Token đã được cập nhật thành công',
    schema: { example: { success: true } },
  })
  @Post('token/update')
  @LogActivity({
    action: 'update_token',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật FCM token',
    resource_type: 'fcm',
    resource_name: 'token',
    resource_id: 'dto.userId',
    severity: ActivitySeverity.INFO,
  })
  async updateToken(
    @Body(new ValidationPipe({ whitelist: true })) dto: UpdateTokenDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      this.assertSelfOrAdmin(req, dto.userId);
      const valid = ['device', 'caregiver', 'emergency', 'customer'] as const;
      const t = valid.includes(dto.type as any) ? (dto.type as any) : undefined;
      this.logger.log(`Updating FCM token for user: ${dto.userId}, type: ${t}`);
      await this._fcmService.updateToken(dto.userId, dto.oldToken, dto.newToken, t, dto.platform);
      this.logger.log(`FCM token updated successfully for user: ${dto.userId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to update FCM token for user: ${dto.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({
    summary: 'Gửi sự kiện hệ thống (AI) tới khách hàng và người chăm sóc',
    description:
      'Gửi thông báo hệ thống từ AI đến khách hàng và tất cả người chăm sóc liên quan. Chỉ admin mới có thể thực hiện.',
  })
  @ApiBody({ type: SystemEventDto, description: 'Thông tin system event' })
  @ApiOkResponse({
    description: 'Kết quả gửi multicast',
    schema: {
      example: {
        successCount: 5,
        failureCount: 0,
        responses: [
          { index: 0, success: true, messageId: 'projects/project-id/messages/111' },
          { index: 1, success: true, messageId: 'projects/project-id/messages/112' },
        ],
        noTokenRecipients: [
          { userId: '550e8400-e29b-41d4-a716-446655440010', reason: 'no_active_tokens' },
        ],
      },
    },
  })
  @ModerateRateLimit()
  @Post('push/system-event')
  @LogActivity({
    action: 'push_system_event',
    action_enum: ActivityAction.CREATE,
    message: 'Gửi system event tới customer và caregivers',
    resource_type: 'fcm',
    resource_name: 'system_event',
    resource_id: 'dto.customerId',
    severity: ActivitySeverity.HIGH,
  })
  async pushSystemEvent(@Body() dto: SystemEventDto) {
    try {
      this.logger.log(`Pushing system event for customer: ${dto.customerId}`);
      const result = await this._fcmService.pushSystemEvent(dto.customerId, dto);
      this.logger.log(
        `System event pushed: ${result.successCount} success, ${result.failureCount} failures`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        'Failed to push system event',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({
    summary: '🔧 Bulk update audience cho tất cả tokens (Admin)',
    description: `Cập nhật audience của tất cả FCM tokens hiện có dựa trên vai trò của user.`,
  })
  @ApiOkResponse({
    description: 'Kết quả bulk update',
    schema: {
      example: { updated: 25, message: 'Successfully updated 25 tokens with correct audience' },
    },
  })
  @Post('admin/bulk-update-audience')
  @LogActivity({
    action: 'admin_bulk_update_audience',
    action_enum: ActivityAction.UPDATE,
    message: 'Admin bulk update audience cho tất cả tokens',
    resource_type: 'fcm',
    resource_name: 'admin_bulk_update_audience',
    severity: ActivitySeverity.MEDIUM,
  })
  async bulkUpdateAudience() {
    try {
      this.logger.log('Starting bulk update of FCM token audiences');
      const result = await this._fcmTokenService.bulkUpdateAllTokensAudience();
      this.logger.log(`Bulk update completed: ${result.updated} tokens updated`);
      return {
        updated: result.updated,
        message: `Successfully updated ${result.updated} tokens with correct audience`,
      };
    } catch (error) {
      this.logger.error(
        'Failed to bulk update FCM token audiences',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({
    summary: '🧪 Gửi test notification đến một token (Admin)',
    description: `Gửi thông báo test đến một FCM token cụ thể để kiểm tra tính năng.`,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'FCM token đích' },
        message: { type: 'string', description: 'Nội dung thông báo' },
      },
      required: ['token'],
    },
  })
  @ApiOkResponse({
    description: 'Kết quả gửi test notification',
    schema: {
      example: {
        successCount: 1,
        failureCount: 0,
        responses: [
          { index: 0, success: true, messageId: 'projects/project-id/messages/1234567890' },
        ],
      },
    },
  })
  @ModerateRateLimit()
  @Post('push/test')
  @LogActivity({
    action: 'send_test_notification',
    action_enum: ActivityAction.UPDATE,
    message: 'Gửi test notification tới một token',
    resource_type: 'fcm',
    resource_name: 'test_push',
    resource_id: 'token',
    severity: ActivitySeverity.INFO,
  })
  async sendTestNotification(@Body('token') token: string, @Body('message') message: string) {
    try {
      if (!token) {
        throw createBadRequestException('Token là bắt buộc');
      }
      this.logger.log(`Sending test notification to token: ${token.substring(0, 10)}...`);
      const res = await this._fcmService.sendTestNotification(
        token,
        message || 'Test notification',
      );
      this.logger.log(
        `Test notification sent: ${res.successCount} success, ${res.failureCount} failures`,
      );
      return res;
    } catch (error) {
      this.logger.error(
        'Failed to send test notification',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  // ==================== DIRECT NOTIFICATION ENDPOINTS ====================

  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({
    summary: 'Gửi thông báo trực tiếp đến một user',
    description: `
    Gửi FCM notification đến tất cả thiết bị active của một user cụ thể.

    **Quyền truy cập**: Admin
    **Rate limit**: Áp dụng giới hạn tốc độ để tránh spam
    **Logging**: Tất cả hoạt động được ghi log chi tiết

    **Payload structure**:
    - notification: Nội dung hiển thị trên device
    - data: Dữ liệu tùy chỉnh cho app xử lý
    - options: Cấu hình platform-specific (Android/iOS/Web)
    `,
  })
  @ApiParam({
    name: 'userId',
    description: 'UUID của user nhận thông báo',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: SendToUserDto,
    description: 'Payload thông báo và tùy chọn gửi',
  })
  @ApiOkResponse({
    type: SendNotificationResponseDto,
    description: 'Kết quả gửi thông báo với thống kê chi tiết',
  })
  @ApiResponse({
    status: 400,
    description: 'User không tồn tại hoặc không có thiết bị active',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền gửi thông báo',
  })
  @ModerateRateLimit()
  @Post('send-to-user/:userId')
  async sendToUser(
    @Param('userId') userId: string,
    @Body() dto: SendToUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const requesterId = getUserIdFromReq(req);
      this.logger.log(`[sendToUser] Sending notification to user ${userId} by ${requesterId}`);

      // Validate userId format
      if (!isValidUuid(userId)) {
        throw createBadRequestException('Định dạng userId không hợp lệ');
      }

      const result = await this._fcmTokenService.sendToUser(userId, dto.payload, dto.options);

      this.logger.log(
        `[sendToUser] Completed for user ${userId}: ${result.successCount} success, ${result.failureCount} failure`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[sendToUser] Failed for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({
    summary: 'Gửi thông báo đến nhiều users cùng lúc',
    description: `
    Gửi FCM notification đến tất cả thiết bị active của nhiều users cùng lúc (bulk sending).

    **Quyền truy cập**: Admin
    **Giới hạn**: Tối đa 100 users per request để tránh spam
    **Rate limit**: Áp dụng giới hạn tốc độ nghiêm ngặt
    **Logging**: Chi tiết cho từng user và tổng hợp

    **Payload structure**:
    - userIds: Mảng UUID của users nhận thông báo
    - notification: Nội dung hiển thị trên device
    - data: Dữ liệu tùy chỉnh cho app xử lý
    - options: Cấu hình platform-specific (Android/iOS/Web)
    `,
  })
  @ApiBody({
    type: SendToUsersDto,
    description: 'Danh sách users và payload thông báo',
  })
  @ApiOkResponse({
    type: SendToUsersResponseDto,
    description: 'Kết quả gửi thông báo tổng hợp cho tất cả users',
  })
  @ApiResponse({
    status: 400,
    description: 'Danh sách userIds không hợp lệ hoặc vượt quá giới hạn',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền gửi thông báo hàng loạt',
  })
  @ModerateRateLimit()
  @Post('send-to-users')
  async sendToUsers(@Body() dto: SendToUsersDto, @Req() req: AuthenticatedRequest) {
    try {
      const requesterId = getUserIdFromReq(req);

      if (!Array.isArray(dto.userIds) || dto.userIds.length === 0) {
        throw createBadRequestException('Danh sách userIds là bắt buộc');
      }
      if (dto.userIds.length > 100) {
        throw createBadRequestException('Giới hạn tối đa 100 users cho mỗi yêu cầu');
      }

      this.logger.log(
        `[sendToUsers] Sending notification to ${dto.userIds.length} users by ${requesterId}`,
      );

      const result = await this._fcmTokenService.sendToUserIds(
        dto.userIds,
        dto.payload,
        dto.options,
      );

      this.logger.log(
        `[sendToUsers] Completed: ${result.totalSuccess} total success, ${result.totalFailure} total failure across ${dto.userIds.length} users`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[sendToUsers] Failed for ${Array.isArray(dto.userIds) ? dto.userIds.length : '0'} users`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  @Public()
  @ApiOperation({ summary: 'FCM status (diagnostic)' })
  @ApiOkResponse({ description: 'Trạng thái Firebase messaging và kết quả gửi gần nhất' })
  @Get('status')
  async status() {
    // return whether firebase messaging is initialized and last multicast result
    try {
      return this._fcmService.getStatus();
    } catch (e) {
      return { initialized: false, error: String(e) };
    }
  }

  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({
    summary: 'Liệt kê FCM tokens với bộ lọc (admin)',
    description:
      'Liệt kê tất cả FCM tokens với các tùy chọn lọc và phân trang. Chỉ admin mới có thể truy cập.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['device', 'caregiver', 'emergency', 'customer'],
  })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'platform', required: false, enum: ['android', 'ios', 'web'] })
  @ApiQuery({ name: 'active', required: false })
  @ApiOkResponse({
    description: 'Danh sách tokens với phân trang',
    schema: { example: { data: [], total: 0, page: 1, limit: 20 } },
  })
  @Get('admin/tokens')
  async getAllTokens(
    @Query('type') type?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('platform') platform?: string,
    @Query('active') active?: string,
  ) {
    try {
      // Parse page parameter manually
      let parsedPage = 1;
      if (page !== undefined) {
        const pageNum = parseInt(page, 10);
        if (!isNaN(pageNum) && pageNum > 0) {
          parsedPage = pageNum;
        }
      }

      // Parse limit parameter manually
      let parsedLimit = 20;
      if (limit !== undefined) {
        const limitNum = parseInt(limit, 10);
        if (!isNaN(limitNum) && limitNum > 0 && limitNum <= 100) {
          parsedLimit = limitNum;
        }
      }

      // Parse active parameter manually to handle edge cases
      let parsedActive: boolean | undefined;
      if (active !== undefined) {
        if (active === 'true') parsedActive = true;
        else if (active === 'false') parsedActive = false;
        else parsedActive = undefined; // Invalid value, treat as undefined
      }

      // Stringify debug payload for clearer logs
      this.logger.debug(
        `[FcmController] getAllTokens called ${JSON.stringify({
          type,
          userId,
          page: parsedPage,
          limit: parsedLimit,
          platform,
          active: parsedActive,
        })}`,
      );
      const valid = ['device', 'caregiver', 'emergency', 'customer'] as const;
      const tokenType = valid.includes(type as any) ? (type as any) : undefined;
      const result = await this._fcmService.getAllTokens({
        type: tokenType,
        userId,
        page: parsedPage,
        limit: parsedLimit,
        platform,
        active: parsedActive,
      });
      this.logger.log(`Retrieved ${result.data?.length || 0} FCM tokens`);
      return result;
    } catch (error) {
      this.logger.error(
        'Failed to get FCM tokens',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({
    summary: 'Xóa hàng loạt FCM tokens (admin)',
    description: 'Xóa nhiều FCM tokens theo userIds hoặc type. Chỉ admin mới có thể thực hiện.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userIds: { type: 'array', items: { type: 'string' } },
        type: { type: 'string', enum: ['device', 'caregiver', 'emergency', 'customer'] },
      },
    },
  })
  @ApiOkResponse({
    description: 'Kết quả xóa hàng loạt',
    schema: { example: { deletedCount: 25, message: 'Tokens deleted successfully' } },
  })
  @Post('admin/tokens/delete')
  @LogActivity({
    action: 'admin_bulk_delete_tokens',
    action_enum: ActivityAction.DELETE,
    message: 'Admin xóa hàng loạt FCM tokens',
    resource_type: 'fcm',
    resource_name: 'admin_bulk_delete',
    resource_id: 'body.userIds',
    severity: ActivitySeverity.HIGH,
  })
  async bulkDeleteTokens(
    @Body(new ValidationPipe({ whitelist: true })) body: { userIds?: string[]; type?: string },
  ) {
    const { userIds, type } = body || {};
    this.logger.debug('[FcmController] bulkDeleteTokens called', { userIds, type } as any);
    const valid = ['device', 'caregiver', 'emergency', 'customer'] as const;
    const tokenType = valid.includes(type as any) ? (type as any) : undefined;
    return this._fcmService.bulkDeleteTokens(userIds ?? [], tokenType);
  }

  /** Thống kê FCM tokens (admin) */
  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({
    summary: 'Xem chi tiết FCM token (admin)',
    description: 'Xem chi tiết của một FCM token theo ID. Chỉ admin mới có thể thực hiện.',
  })
  @ApiOkResponse({
    description: 'Thống kê tokens',
    schema: {
      example: {
        byPlatform: [
          { platform: 'android', count: '150' },
          { platform: 'ios', count: '75' },
          { platform: 'web', count: '25' },
        ],
        byUser: [
          { user_id: 'user-uuid-1', count: '3' },
          { user_id: 'user-uuid-2', count: '1' },
        ],
      },
    },
  })
  @Get('admin/tokens/stats')
  async getTokenStats() {
    try {
      this.logger.debug(`Retrieving FCM token statistics`);
      const result = await this._fcmService.tokenStats();
      this.logger.debug(`FCM token statistics retrieved`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve FCM token statistics`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /** Xem chi tiết FCM token (admin) */
  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({
    summary: 'Lấy thống kê FCM tokens (admin)',
    description:
      'Lấy thống kê FCM tokens theo platform và theo user. Chỉ admin mới có thể thực hiện.',
  })
  @ApiParam({ name: 'id', required: true, description: 'UUID của token' })
  @ApiOkResponse({
    description: 'Chi tiết token',
    schema: {
      example: {
        id: 'token-uuid',
        userId: 'user-uuid',
        token: 'fcm-token-string',
        type: 'device',
        platform: 'android',
        deviceId: 'device-uuid',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastUsedAt: '2024-01-01T12:00:00Z',
      },
    },
  })
  @Get('admin/tokens/:id')
  async getTokenDetail(@Param('id') id: string) {
    try {
      this.logger.debug(`Retrieving FCM token detail: ${id}`);
      const result = await this._fcmService.getTokenDetail(id);
      this.logger.debug(`FCM token detail retrieved: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve FCM token detail: ${id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({
    summary: 'Cập nhật thông tin token (admin)',
    description: 'Cập nhật thông tin của FCM token theo ID. Chỉ admin mới có thể thực hiện.',
  })
  @ApiParam({ name: 'id', required: true, description: 'UUID của token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['device', 'caregiver', 'emergency', 'customer'] },
        userId: { type: 'string' },
        platform: { type: 'string', enum: ['android', 'ios', 'web'] },
      },
    },
  })
  @ApiOkResponse({
    description: 'Token đã được cập nhật',
    schema: { example: { id: 'token-uuid', message: 'Token updated successfully' } },
  })
  @Put('admin/tokens/:id')
  @LogActivity({
    action: 'admin_update_token',
    action_enum: ActivityAction.UPDATE,
    message: 'Admin cập nhật thông tin FCM token',
    resource_type: 'fcm',
    resource_name: 'admin_update_token',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async updateTokenAdmin(
    @Param('id') id: string,
    @Body('type') type?: string,
    @Body('userId') userId?: string,
    @Body('platform') platform?: 'android' | 'ios' | 'web',
  ) {
    try {
      this.logger.log(`Admin updating FCM token: ${id}`);
      const valid = ['device', 'caregiver', 'emergency', 'customer'] as const;
      const tokenType = valid.includes(type as any) ? (type as any) : undefined;
      const result = await this._fcmService.updateTokenAdmin(id, tokenType, userId, platform);
      this.logger.log(`FCM token updated successfully: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to update FCM token: ${id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({
    summary: 'Cập nhật trạng thái active/inactive của FCM token (admin)',
    description:
      'Thay đổi trạng thái active/inactive của FCM token. Chỉ admin mới có thể thực hiện.',
  })
  @ApiParam({ name: 'id', required: true, description: 'UUID của token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { active: { type: 'boolean' } },
      required: ['active'],
    },
  })
  @ApiOkResponse({
    description: 'Trạng thái token đã được cập nhật',
    schema: {
      example: { id: 'token-uuid', isActive: true, message: 'Token status updated successfully' },
    },
  })
  @ApiResponse({ status: 404, description: 'Token không tồn tại' })
  @Patch('admin/tokens/:id/status')
  @LogActivity({
    action: 'admin_update_token_status',
    action_enum: ActivityAction.UPDATE,
    message: 'Admin cập nhật trạng thái FCM token',
    resource_type: 'fcm',
    resource_name: 'admin_update_token_status',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async updateTokenStatus(
    @Param('id') id: string,
    @Body('active') active: boolean,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Admin updating FCM token status: ${id} -> ${active}`);
      const adminUserId = getRequesterId(req);
      const result = await this._fcmService.setTokenStatus(id, active, adminUserId);
      this.logger.log(`FCM token status updated successfully: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to update FCM token status: ${id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({
    summary: 'Xuất danh sách FCM tokens theo thời gian tạo (admin)',
    description:
      'Xuất danh sách FCM tokens được tạo trong khoảng thời gian chỉ định. Chỉ admin mới có thể truy cập.',
  })
  @ApiQuery({ name: 'from', required: true, description: 'Ngày bắt đầu (ISO string)' })
  @ApiQuery({ name: 'to', required: true, description: 'Ngày kết thúc (ISO string)' })
  @ApiOkResponse({ description: 'Danh sách tokens được xuất' })
  @Get('admin/tokens/export')
  async exportTokens(@Query('from') from: string, @Query('to') to: string) {
    try {
      this.logger.log(`Exporting FCM tokens from ${from} to ${to}`);
      const result = await this._fcmService.exportTokens({ from, to });
      this.logger.log(`FCM tokens exported: ${result.length} tokens`);
      return result;
    } catch (error) {
      this.logger.error(
        'Failed to export FCM tokens',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({
    summary: 'Lọc/xuất danh sách FCM token theo thời gian tạo (admin)',
    description:
      'Xuất danh sách FCM tokens được tạo trong khoảng thời gian chỉ định. Chỉ admin mới có thể truy cập.',
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiOkResponse({ description: 'Danh sách tokens được xuất' })
  @Get('admin/metrics')
  async getMetrics() {
    try {
      this.logger.log('Retrieving FCM metrics');
      const allTokens = await this._fcmService.getAllTokens({ page: 1, limit: 1000 });
      // Normalize active flag - accept both snake_case and camelCase from different layers
      const activeTokens = allTokens.data.filter((token: any) => {
        return ((token.is_active ?? token.isActive) as boolean) === true;
      });
      const now = new Date();
      const result = {
        totalTokens: allTokens.total,
        activeTokens: activeTokens.length,
        inactiveTokens: allTokens.total - activeTokens.length,
        tokensByPlatform: this.groupByPlatform(allTokens.data),
        tokensByType: this.groupByType(allTokens.data),
        lastUpdated: now.toISOString(),
        lastUpdated_local: timeUtils.toTimezoneIsoString(now),
      };
      this.logger.log(`FCM metrics retrieved: ${result.totalTokens} total tokens`);
      return result;
    } catch (error) {
      this.logger.error(
        'Failed to retrieve FCM metrics',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private groupByPlatform(tokens: FcmToken[]): Record<string, number> {
    return tokens.reduce(
      (acc, token) => {
        const platform = token.platform || 'unknown';
        acc[platform] = (acc[platform] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private groupByType(tokens: FcmToken[]): Record<string, number> {
    return tokens.reduce(
      (acc, token) => {
        const type = (token as any).type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({
    summary: 'Khóa/bỏ kích hoạt FCM token (admin)',
    description:
      'Thay đổi trạng thái active/inactive của FCM token. Chỉ admin mới có thể thực hiện.',
  })
  @ApiParam({ name: 'id', required: true, description: 'UUID của token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { active: { type: 'boolean' } },
      required: ['active'],
    },
  })
  @ApiOkResponse({
    description: 'Trạng thái token đã được cập nhật',
    schema: {
      example: { id: 'token-uuid', isActive: true, message: 'Token status updated successfully' },
    },
  })
  @ApiResponse({ status: 404, description: 'Token không tồn tại' })
  @ApiOperation({ summary: 'Dọn dẹp FCM tokens hết hạn (admin)' })
  @Post('admin/cleanup-expired')
  @LogActivity({
    action: 'cleanup_expired_tokens',
    action_enum: ActivityAction.DELETE,
    message: 'Dọn dẹp FCM tokens hết hạn',
    resource_type: 'fcm',
    resource_name: 'cleanup_expired',
    resource_id: 'daysOld',
    severity: ActivitySeverity.MEDIUM,
  })
  async cleanupExpiredTokens(@Body('daysOld') daysOld: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const allTokens = await this._fcmService.getAllTokens({ page: 1, limit: 10000 });
    const expiredTokens = allTokens.data.filter((token: FcmToken) => {
      const createdAt = new Date(token.created_at);
      return createdAt < cutoffDate;
    });
    let deletedCount = 0;
    for (const token of expiredTokens) {
      try {
        await this._fcmService.deleteToken(token.user_id, token.token);
        deletedCount++;
      } catch (error) {
        this.logger.error(`Failed to delete expired token: ${token.id}`, error);
      }
    }
    return {
      message: `Cleaned up ${deletedCount} expired tokens older than ${daysOld} days`,
      deletedCount,
      cutoffDate: cutoffDate.toISOString(),
      cutoffDate_local: timeUtils.toTimezoneIsoString(cutoffDate),
    };
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Gửi notification đến device cụ thể',
    description:
      'Gửi push notification chỉ đến một device cụ thể của user. Chỉ admin hoặc chính user đó mới có thể thực hiện.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        deviceId: { type: 'string' },
        title: { type: 'string' },
        body: { type: 'string' },
        data: { type: 'object' },
      },
      required: ['userId', 'deviceId', 'title'],
    },
  })
  @ApiOkResponse({
    description: 'Kết quả gửi notification',
    schema: { example: { successCount: 1, failureCount: 0, responses: [] } },
  })
  @Post('device/notification')
  @LogActivity({
    action: 'notify_device',
    action_enum: ActivityAction.UPDATE,
    message: 'Gửi notification tới một thiết bị',
    resource_type: 'fcm',
    resource_name: 'device_notification',
    resource_id: 'body.userId',
    severity: ActivitySeverity.INFO,
  })
  async sendToDevice(
    @Body(new ValidationPipe({ whitelist: true }))
    body: {
      userId: string;
      deviceId: string;
      title: string;
      body?: string;
      data?: Record<string, string>;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertSelfOrAdmin(req, body.userId);
    return this._fcmService.sendNotificationToDevice(
      body.userId,
      body.deviceId,
      body.title,
      body.body,
      body.data,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Broadcast notification đến tất cả devices khác',
    description:
      'Gửi push notification đến tất cả devices của user trừ device gửi request. Chỉ admin hoặc chính user đó mới có thể thực hiện.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        excludeDeviceId: { type: 'string' },
        title: { type: 'string' },
        body: { type: 'string' },
        data: { type: 'object' },
      },
      required: ['userId', 'excludeDeviceId', 'title'],
    },
  })
  @ApiOkResponse({
    description: 'Kết quả broadcast',
    schema: { example: { successCount: 2, failureCount: 0, responses: [] } },
  })
  @Post('device/broadcast')
  @LogActivity({
    action: 'broadcast_devices',
    action_enum: ActivityAction.UPDATE,
    message: 'Broadcast notification tới các thiết bị khác',
    resource_type: 'fcm',
    resource_name: 'device_broadcast',
    resource_id: 'body.userId',
    severity: ActivitySeverity.INFO,
  })
  async broadcastToOtherDevices(
    @Body(new ValidationPipe({ whitelist: true }))
    body: {
      userId: string;
      excludeDeviceId: string;
      title: string;
      body?: string;
      data?: Record<string, string>;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      this.assertSelfOrAdmin(req, body.userId);
      this.logger.log(
        `Broadcasting to other devices for user: ${body.userId}, excluding: ${body.excludeDeviceId}`,
      );
      const result = await this._fcmService.broadcastToOtherDevices(
        body.userId,
        body.excludeDeviceId,
        body.title,
        body.body,
        body.data,
      );
      this.logger.log(
        `Broadcast completed: ${result.successCount} success, ${result.failureCount} failures`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to broadcast to other devices for user: ${body.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Deactivate FCM tokens của device',
    description: 'Deactivate tất cả FCM tokens của một device cụ thể. Thường dùng khi logout.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        deviceId: { type: 'string' },
      },
      required: ['userId'],
    },
  })
  @ApiOkResponse({ description: 'Kết quả deactivate', schema: { example: { deactivated: 2 } } })
  @Post('device/deactivate')
  @LogActivity({
    action: 'deactivate_device_tokens',
    action_enum: ActivityAction.UPDATE,
    message: 'Deactivate FCM tokens của device',
    resource_type: 'fcm',
    resource_name: 'device_deactivate',
    resource_id: 'body.userId',
    severity: ActivitySeverity.INFO,
  })
  async deactivateDeviceTokens(
    @Body(new ValidationPipe({ whitelist: true })) body: { userId: string; deviceId?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      this.assertSelfOrAdmin(req, body.userId);
      this.logger.log(
        `Deactivating device tokens for user: ${body.userId}, device: ${body.deviceId || 'all'}`,
      );
      const result = await this._fcmService.deactivateDeviceTokens(body.userId, body.deviceId);
      this.logger.log(`Deactivated ${result.deactivated} device tokens for user: ${body.userId}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to deactivate device tokens for user: ${body.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  @Public()
  @ApiOperation({
    summary: 'Debug: Fix topics format',
    description: 'Sửa format topics từ string thành object',
  })
  @Post('debug-fix-topics')
  @LogActivity({
    action: 'debug_fix_topics',
    action_enum: ActivityAction.UPDATE,
    message: 'Sửa định dạng topics từ string sang object',
    resource_type: 'fcm',
    resource_name: 'debug_fix_topics',
    severity: ActivitySeverity.LOW,
  })
  async debugFixTopics() {
    try {
      this.logger.log('Starting debug fix for topics format');
      const tokens = await this._fcmTokenService.findTokensWithTopics();
      let fixed = 0;
      for (const token of tokens) {
        if (typeof token.topics === 'string') {
          try {
            const parsed = JSON.parse(token.topics);
            if (token.id) {
              await this._fcmTokenService.updateTokenTopics(token.id, parsed);
              fixed++;
            }
          } catch (error: unknown) {
            this.logger.error(`Failed to parse token ${token.id}: ${token.topics}`, error);
          }
        }
      }
      this.logger.log(`Debug fix completed: ${fixed} tokens fixed`);
      return { fixed };
    } catch (error) {
      this.logger.error(
        'Failed to debug fix topics',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  @Get('debug/topics/:userId')
  @Public()
  async debugTopics(@Param('userId') userId: string) {
    try {
      this.logger.debug(`Debug retrieving topics for user: ${userId}`);
      const tokens = await this._fcmTokenService.getActiveFcmTokensByUserId(userId);
      const result = {
        userId,
        tokens: tokens.map((t: FcmToken) => ({
          tokenId: t.id,
          token: t.token.substring(0, 20) + '...',
          topics: t.topics,
          topicsType: typeof t.topics,
          isActive: t.is_active,
        })),
      };
      this.logger.debug(`Debug topics retrieved for user: ${userId}, ${tokens.length} tokens`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to debug topics for user: ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  @Get('debug/query/:userId')
  @Public()
  async debugQuery(@Param('userId') userId: string) {
    const tokens = await this._fcmTokenService.getActiveFcmTokensByUserId(userId);
    const customerTokens = tokens.filter((t: FcmToken) => {
      try {
        return t.topics?.audience === 'customer';
      } catch {
        return false;
      }
    });
    return {
      userId,
      audience: 'customer',
      totalTokens: tokens.length,
      customerTokens: customerTokens.length,
      tokens: customerTokens.map((t: FcmToken) => ({
        tokenId: t.id,
        token: t.token.substring(0, 20) + '...',
        topics: t.topics,
        isActive: t.is_active,
      })),
    };
  }

  @Post('debug/notification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: '🔍 Debug FCM notification với payload đầy đủ',
    description: `
    Endpoint để debug FCM notification với payload đầy đủ.
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        title: { type: 'string', default: 'Debug Notification' },
        body: { type: 'string', default: 'This is a debug notification' },
        data: { type: 'object', example: { customField: 'value' } },
      },
      required: ['token'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Debug notification result',
  })
  @LogActivity({
    action: 'debug_notification',
    action_enum: ActivityAction.UPDATE,
    message: 'Gửi debug FCM notification với payload đầy đủ',
    resource_type: 'fcm',
    resource_name: 'debug_notification',
    resource_id: 'token',
    severity: ActivitySeverity.LOW,
  })
  async debugFcmNotification(
    @Body('token') token: string,
    @Body('title') title?: string,
    @Body('body') body?: string,
    @Body('data') customData?: Record<string, any>,
  ) {
    if (!token) {
      throw createBadRequestException('Token là bắt buộc');
    }
    const debugTitle = title || '🔍 Debug Notification';
    const debugBody = body || 'This is a debug notification from backend';
    const debugData: Record<string, any> = {
      type: 'debug_notification',
      timestamp: new Date().toISOString(),
      notificationId: `debug_${Date.now()}`,
      priority: 'high',
      debug: 'true',
      ...(customData || {}),
    };
    // Add VN local timestamp for convenience
    try {
      debugData.timestamp_local = timeUtils.toTimezoneIsoString(new Date());
    } catch {}
    this.logger.log(`🔍 Sending debug FCM notification to token: ${token.substring(0, 10)}...`);
    this.logger.log(`🔍 Debug payload:`, JSON.stringify(debugData, null, 2));
    try {
      const fullMessage = `${debugTitle}\n\n${debugBody}\n\nDebug Data: ${JSON.stringify(debugData)}`;
      const result = await this._fcmService.sendTestNotification(token, fullMessage);
      this.logger.log(`🔍 Debug notification result:`, result);
      return {
        success: result.successCount > 0,
        message: `Debug notification sent: ${result.successCount} success, ${result.failureCount} failures`,
        payload: {
          notification: { title: debugTitle, body: debugBody },
          data: debugData,
        },
        response: result,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to send debug notification:`, error);
      throw createBadRequestException(
        `Failed to send debug notification: ${(error as Error).message}`,
      );
    }
  }

  @ApiOperation({
    summary: '📤 Gửi tin nhắn giữa Customer ↔ Caregiver',
    description: `
## 🎯 Mục đích
Endpoint cho phép gửi push notification tin nhắn giữa Customer và Caregiver với **validation assignment relationships**.

## 🔐 Bảo mật & Authorization
- **Public endpoint**: Không yêu cầu JWT token
- **Assignment validation**: Backend tự động kiểm tra quan hệ accepted giữa sender và recipients
- **Token verification** (optional): Xác minh \`fromToken\` thuộc về \`fromUserId\`

## 📋 Business Rules

### **Direction: customer_to_caregiver**
- **Sender**: Customer (fromUserId = customer_id)
- **Recipients**: Chỉ gửi đến **caregivers đã accepted** của customer này
- **Backend filter**: Lấy danh sách caregivers từ \`caregiver_invitations\` (status=accepted)
- **Validation**: \`toUserIds\` phải chứa **caregiver_id**, không phải customer_id

### **Direction: caregiver_to_customer**
- **Sender**: Caregiver (fromUserId = caregiver_id)
- **Recipients**: Chỉ gửi đến **customers đã assigned** cho caregiver này
- **Backend filter**: Lấy danh sách customers từ \`caregiver_invitations\` (status=accepted)
- **Validation**: \`toUserIds\` phải chứa **customer_id**, không phải caregiver_id

## 🔄 Flow hoạt động

1. **Sanitize recipients**: Loại bỏ sender ID khỏi \`toUserIds\`
2. **Filter by assignment**: Chỉ giữ recipients có quan hệ accepted với sender
3. **Token verification** (nếu có \`fromToken\`): Kiểm tra token thuộc sender
4. **Send notification**: Gửi FCM push đến tất cả devices của recipients
5. **Return result**: Trả về \`{successCount, failureCount, responses}\`

## 📊 Categories

| Category | Description | Use Case | Priority |
|----------|-------------|----------|----------|
| \`help\` | Yêu cầu trợ giúp | Customer cần hỗ trợ gấp | High |
| \`reminder\` | Nhắc nhở | Nhắc uống thuốc, lịch khám | Normal |
| \`report\` | Báo cáo | Báo cáo tình trạng sức khỏe | Normal |
| \`confirm\` | Xác nhận | Xác nhận đã nhận tin nhắn | Normal |

## 📱 FCM Payload Structure

### Notification Object (Hiển thị trên device)
\`\`\`json
{
  "notification": {
    "title": "Yêu cầu hỗ trợ", // hoặc "Tin nhắn từ Caregiver"
    "body": "Nội dung tin nhắn từ request"
  }
}
\`\`\`

### Data Object (Cho app xử lý)
\`\`\`json
{
  "data": {
    "type": "actor_message",
    "direction": "customer_to_caregiver",
    "category": "help|reminder|report|confirm",
    "fromUserId": "customer-uuid",
    "toUserIds": "caregiver-uuid-1,caregiver-uuid-2",
    "message": "Nội dung tin nhắn",
    "timestamp": "2025-10-22T10:30:00.000Z",
    "notificationId": "msg_customer-uuid_1734567890123",
    "priority": "high|normal",
    "recipientCount": "2",
    "deeplink": "detectcare://chat?from=customer-uuid"
  }
}
\`\`\`

## 🚨 Error Scenarios

### 400 - Bad Request
- \`toUserIds\` empty sau khi sanitize
- \`toUserIds\` > 50 recipients
- Invalid UUID format

### 403 - Forbidden
- Không có recipients hợp lệ sau filter (không có assignment accepted)
- \`fromToken\` không thuộc về \`fromUserId\`

### 500 - Internal Server Error
- Lỗi kết nối FCM
- Lỗi database

## 💡 Best Practices

1. **Lấy danh sách recipients trước:**
   \`\`\`bash
   # Customer app
   GET /api/caregiver-invitations/customer/me?status=accepted
   # Extract: caregivers.map(c => c.caregiver_id)

   # Caregiver app
   GET /api/caregiver-invitations/caregiver/me?status=accepted
   # Extract: customers.map(c => c.customer_id)
   \`\`\`

2. **Gửi đúng IDs theo direction:**
   - Customer gửi → \`toUserIds = [caregiver_id_1, caregiver_id_2, ...]\`
   - Caregiver gửi → \`toUserIds = [customer_id_1, customer_id_2, ...]\`

3. **Không gửi sender ID trong toUserIds** (backend tự loại bỏ)

4. **Rate limit**: Tối đa 50 recipients/request

## 📝 Example Requests

### Customer → Caregiver (Help Request)
\`\`\`json
{
  "fromUserId": "customer-uuid",
  "toUserIds": ["caregiver-uuid-1", "caregiver-uuid-2"],
  "direction": "customer_to_caregiver",
  "category": "help",
  "message": "Em cần hỗ trợ gấp tại phòng 12",
  "deeplink": "myapp://room/12"
}
\`\`\`

### Caregiver → Customer (Reminder)
\`\`\`json
{
  "fromUserId": "caregiver-uuid",
  "toUserIds": ["customer-uuid"],
  "direction": "caregiver_to_customer",
  "category": "reminder",
  "message": "Nhắc nhở: Đã đến giờ uống thuốc",
  "deeplink": "myapp://medication/reminder"
}
\`\`\`

## ✅ Success Response
\`\`\`json
{
  "successCount": 2,
  "failureCount": 0,
  "responses": [
    {
      "index": 0,
      "success": true,
      "messageId": "projects/.../messages/..."
    },
    {
      "index": 1,
      "success": true,
      "messageId": "projects/.../messages/..."
    }
  ],
  "tokensMap": {
    "caregiver-uuid-1": ["fcm-token-1"],
    "caregiver-uuid-2": ["fcm-token-2", "fcm-token-3"]
  },
  "noTokenRecipients": []
}
\`\`\`

## � Response Fields Explanation

| Field | Type | Description |
|-------|------|-------------|
| \`successCount\` | number | Số lượng recipients nhận thành công |
| \`failureCount\` | number | Số lượng recipients gửi thất bại |
| \`responses\` | array | Chi tiết kết quả cho từng recipient |
| \`tokensMap\` | object | Map user_id → danh sách FCM tokens |
| \`noTokenRecipients\` | array | Danh sách user_id không có FCM token |

## 🔧 Technical Implementation

### Processing Flow
1. **Input Validation**: UUID format, recipient limits
2. **Recipient Sanitization**: Loại bỏ sender khỏi toUserIds
3. **Assignment Filtering**: Chỉ giữ users có accepted relationship
4. **Preference Filtering**: Kiểm tra notification preferences
5. **Token Retrieval**: Lấy FCM tokens cho recipients
6. **Payload Construction**: Tạo notification + data payload
7. **Token Exclusion**: Loại bỏ sender token (nếu có)
8. **FCM Multicast**: Gửi đến tất cả tokens
9. **Result Aggregation**: Tổng hợp kết quả
10. **Activity Logging**: Ghi log cho audit trail

### Rate Limiting
- **Limit**: 50 recipients per request
- **Window**: Per request (không có time window)
- **Scope**: Per IP/client

### Monitoring & Logging
- **Activity Logs**: Mỗi message được log với severity INFO
- **Metrics**: Success/failure counts, delivery rates
- **Debug Logs**: Chi tiết từng bước xử lý
- **Error Tracking**: Comprehensive error logging

## �🔍 Related Endpoints
- \`GET /api/caregiver-invitations/customer/me\` - Lấy caregivers của customer
- \`GET /api/caregiver-invitations/caregiver/me\` - Lấy customers của caregiver
- \`GET /api/fcm/my-tokens\` - Lấy FCM tokens của user hiện tại
- \`POST /api/fcm/token\` - Đăng ký FCM token

## 🐛 Troubleshooting

### Common Issues
- **"Không có recipients hợp lệ"**: Kiểm tra assignment status = 'accepted'
- **"fromToken không thuộc về sender"**: Token đã expired hoặc không đúng
- **Empty responses**: Recipients không có FCM tokens hoặc đã tắt notifications
- **High failure rate**: Kiểm tra FCM server status

### Debug Steps
1. Verify assignment relationships
2. Check notification preferences
3. Validate FCM tokens
4. Test FCM connectivity
5. Check app notification permissions

### Performance Notes
- **Batch Processing**: Tối đa 500 tokens per FCM request
- **Timeout**: 120 seconds TTL
- **Retry**: Không tự động retry (manual retry recommended)
- **Collapse Key**: \`actor-{fromUserId}\` để tránh duplicate messages
    `,
  })
  @ApiBody({
    type: ActorMessageDto,
    examples: {
      customer_to_caregiver: {
        summary: 'Customer gửi yêu cầu hỗ trợ đến Caregiver',
        value: {
          fromUserId: '37cbad15-483d-42ff-b07d-fbf3cd1cc863',
          toUserIds: ['24931cc6-4935-4b9e-a860-96b4e5cd7b7f'],
          direction: 'customer_to_caregiver',
          category: 'help',
          message: 'Em cần hỗ trợ gấp, vui lòng đến phòng',
          deeplink: 'myapp://help/request',
        },
      },
      caregiver_to_customer: {
        summary: 'Caregiver gửi nhắc nhở đến Customer',
        value: {
          fromUserId: '24931cc6-4935-4b9e-a860-96b4e5cd7b7f',
          toUserIds: ['37cbad15-483d-42ff-b07d-fbf3cd1cc863'],
          direction: 'caregiver_to_customer',
          category: 'reminder',
          message: 'Nhắc nhở: Đã đến giờ uống thuốc',
          deeplink: 'myapp://medication/reminder',
        },
      },
      with_token_verification: {
        summary: 'Gửi tin nhắn với token verification',
        value: {
          fromUserId: '37cbad15-483d-42ff-b07d-fbf3cd1cc863',
          toUserIds: ['24931cc6-4935-4b9e-a860-96b4e5cd7b7f'],
          direction: 'customer_to_caregiver',
          category: 'help',
          message: 'Cần hỗ trợ ngay',
          fromToken: 'fcm-token-xyz-123',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Tin nhắn đã được gửi thành công',
    schema: {
      type: 'object',
      properties: {
        successCount: {
          type: 'number',
          description: 'Số lượng recipients nhận thành công',
          example: 2,
        },
        failureCount: {
          type: 'number',
          description: 'Số lượng recipients gửi thất bại',
          example: 0,
        },
        responses: {
          type: 'array',
          description: 'Chi tiết kết quả gửi cho từng recipient',
          items: {
            type: 'object',
            properties: {
              index: { type: 'number', example: 0 },
              success: { type: 'boolean', example: true },
              messageId: { type: 'string', example: 'projects/vision-ai/messages/abc123' },
              error: { type: 'string', description: 'Chi tiết lỗi nếu thất bại' },
            },
          },
        },
        tokensMap: {
          type: 'object',
          description: 'Map user_id → FCM tokens đã gửi',
          example: {
            'caregiver-uuid-1': ['fcm-token-1'],
            'caregiver-uuid-2': ['fcm-token-2', 'fcm-token-3'],
          },
        },
        noTokenRecipients: {
          type: 'array',
          description: 'Danh sách user_id không có FCM token',
          items: { type: 'string' },
          example: [],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu đầu vào không hợp lệ',
    schema: {
      example: {
        statusCode: 400,
        message: 'Danh sách người nhận trống',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền gửi tin nhắn',
    schema: {
      examples: {
        no_assignment: {
          summary: 'Không có assignment accepted',
          value: {
            statusCode: 403,
            message: 'Không có recipients có thể gửi cho sender/direction này',
            error: 'Forbidden',
          },
        },
        invalid_token: {
          summary: 'fromToken không thuộc về sender',
          value: {
            statusCode: 403,
            message: 'fromToken không thuộc về sender userId',
            error: 'Forbidden',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi server nội bộ',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  @Public()
  @ModerateRateLimit()
  @Post('push/message')
  @LogActivity({
    action: 'push_actor_message',
    action_enum: ActivityAction.CREATE,
    message: 'Gửi tin nhắn giữa customer và caregiver',
    resource_type: 'fcm',
    resource_name: 'actor_message',
    resource_id: 'dto.fromUserId',
    severity: ActivitySeverity.INFO,
  })
  async pushActorMessage(
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    dto: ActorMessageDto,
  ) {
    try {
      const senderId: string = dto.fromUserId;
      // Validate UUID formats early
      if (!isValidUuid(senderId)) throw createBadRequestException('fromUserId không hợp lệ');
      if (!Array.isArray(dto.toUserIds) || dto.toUserIds.length === 0)
        throw createBadRequestException('Danh sách người nhận trống');
      for (const id of dto.toUserIds) {
        if (!isValidUuid(id)) throw createBadRequestException('toUserIds chứa UUID không hợp lệ');
      }

      this.logger.debug('[FcmController] pushActorMessage called', {
        senderId,
        direction: dto.direction,
        category: dto.category,
        toUserIdsCount: Array.isArray(dto.toUserIds) ? dto.toUserIds.length : 0,
        hasFromToken: Boolean(dto.fromToken),
      } as any);
      const recipients = sanitizeRecipients(dto.toUserIds, senderId);
      if (!recipients.length) throw createBadRequestException('Danh sách người nhận trống');
      if (recipients.length > 50) throw createBadRequestException('Giới hạn tối đa 50 người nhận');
      dto.toUserIds = recipients;
      const allowed = await this._fcmService.filterDeliverableTargets(
        senderId,
        dto.toUserIds,
        dto.direction as any,
      );
      if (!allowed.length)
        throw createForbiddenException('Không có recipients có thể gửi cho sender/direction này');
      dto.toUserIds = allowed;
      if (dto.fromToken) {
        const exists = await this._fcmService.checkToken(senderId, dto.fromToken);
        if (!exists?.exists)
          throw createForbiddenException('fromToken không thuộc về sender userId');
      }
      const result = await this._fcmService.pushActorMessage(dto as any);
      this.logger.log(
        `Actor message sent successfully: ${result.successCount} success, ${result.failureCount} failures`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        'Failed to push actor message',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
