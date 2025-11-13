import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../application/dto/shared/error-response.dto';
import { DeviceSyncService } from '../../../shared/services/device-sync.service';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';
import type { AuthenticatedRequest } from '../../../shared/types/auth.types';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';

@ApiTags('device sync')
@ApiBearerAuth()
@Controller('device-sync')
@UseGuards(JwtAuthGuard)
export class DeviceSyncController {
  constructor(private readonly _deviceSyncService: DeviceSyncService) {}

  @Post('send/:deviceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi tin nhắn tới một thiết bị cụ thể' })
  @ApiParam({ name: 'deviceId', description: 'ID thiết bị đích' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['sync', 'command', 'data', 'notification'] },
        payload: { type: 'object' },
        priority: { type: 'string', enum: ['low', 'normal', 'high'] },
        ttl: { type: 'number' },
      },
      required: ['type', 'payload'],
    },
  })
  @ApiResponse({ status: 200, description: 'Gửi tin nhắn thành công' })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @LogActivity({
    action: 'send_device_message',
    action_enum: ActivityAction.UPDATE,
    message: 'Gửi tin nhắn đến thiết bị',
    resource_type: 'device_sync',
    resource_name: 'send',
    resource_id: 'deviceId',
    severity: ActivitySeverity.INFO,
  })
  async sendToDevice(
    @Param('deviceId') deviceId: string,
    @Body() message: any,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = getUserIdFromReq(req);
    const success = await this._deviceSyncService.sendToDevice(userId, deviceId, message, {});
    return {
      success,
      message: success ? 'Message sent successfully' : 'Failed to send message',
    };
  }

  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Phát (broadcast) tin nhắn tới tất cả thiết bị của người dùng' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['sync', 'command', 'data', 'notification'] },
        payload: { type: 'object' },
      },
      required: ['type', 'payload'],
    },
  })
  @ApiResponse({ status: 200, description: 'Phát tin nhắn thành công' })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @LogActivity({
    action: 'broadcast_device_message',
    action_enum: ActivityAction.UPDATE,
    message: 'Broadcast tin nhắn tới toàn bộ thiết bị của người dùng',
    resource_type: 'device_sync',
    resource_name: 'broadcast',
    resource_id: 'user.userId',
    severity: ActivitySeverity.INFO,
  })
  async broadcastToAllDevices(@Body() message: any, @Request() req: AuthenticatedRequest) {
    const userId = getUserIdFromReq(req);
    const sentCount = await this._deviceSyncService.broadcastToAllDevices(userId, message);
    return {
      success: sentCount > 0,
      sentCount,
      message: `Message sent to ${sentCount} device(s)`,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Lấy trạng thái đồng bộ thiết bị' })
  @ApiResponse({ status: 200, description: 'Truy vấn trạng thái thiết bị thành công' })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  async getDeviceStatus(@Request() req: AuthenticatedRequest) {
    const userId = getUserIdFromReq(req);
    const status = this._deviceSyncService.getDeviceStatus(userId);
    return {
      userId,
      ...status,
    };
  }

  @Get('devices/:deviceId/online')
  @ApiOperation({ summary: 'Kiểm tra thiết bị có đang trực tuyến (online) hay không' })
  @ApiParam({ name: 'deviceId', description: 'ID thiết bị cần kiểm tra' })
  @ApiResponse({ status: 200, description: 'Kiểm tra trạng thái online thành công' })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  async isDeviceOnline(@Param('deviceId') deviceId: string, @Request() req: AuthenticatedRequest) {
    const userId = getUserIdFromReq(req);
    const isOnline = this._deviceSyncService.isDeviceOnline(userId, deviceId);
    return {
      deviceId,
      isOnline,
    };
  }
}
