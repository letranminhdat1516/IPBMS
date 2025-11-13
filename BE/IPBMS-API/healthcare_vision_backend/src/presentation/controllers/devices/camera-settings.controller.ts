import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiForbiddenResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../application/dto/shared/error-response.dto';
import { CreateCameraSettingDto } from '../../../application/dto/camera-settings/create-camera-setting.dto';
import { UpdateCameraSettingDto } from '../../../application/dto/camera-settings/update-camera-setting.dto';
import { CameraSettingsService } from '../../../application/services/devices';
import { TicketsService } from '../../../application/services/tickets.service';
import { Req } from '@nestjs/common';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { CameraSetting } from '../../../core/entities/camera_settings.entity';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { CameraSettingsSwagger } from '../../../swagger/camera-settings.swagger';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@ApiTags('camera-settings')
@Controller('camera-settings')
export class CameraSettingsController {
  constructor(
    private readonly _service: CameraSettingsService,
    private readonly _ticketsService: TicketsService,
  ) {}

  @Get()
  @CameraSettingsSwagger.list
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  async findAll(): Promise<CameraSetting[]> {
    return this._service.findAll();
  }

  @Get(':id')
  @CameraSettingsSwagger.getById
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  async findById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<CameraSetting> {
    return this._service.findById(id);
  }

  @Post()
  @CameraSettingsSwagger.create
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @LogActivity({
    action: 'create_camera_setting',
    action_enum: ActivityAction.CREATE ?? ActivityAction.UPDATE,
    message: 'Tạo camera setting mới',
    resource_type: 'camera_setting',
    resource_name: 'camera_setting',
    resource_id: '@result.id',
    severity: ActivitySeverity.INFO,
  })
  async create(@Body() data: CreateCameraSettingDto) {
    return this._service.create(data);
  }

  @Put(':id')
  @CameraSettingsSwagger.update
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @LogActivity({
    action: 'update_camera_setting',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật camera setting',
    resource_type: 'camera_setting',
    resource_name: 'camera_setting',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() data: UpdateCameraSettingDto,
  ) {
    await this._service.update(id, data);
    return { message: 'Camera setting updated successfully' };
  }

  @Delete(':id')
  @CameraSettingsSwagger.delete
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @LogActivity({
    action: 'delete_camera_setting',
    action_enum: ActivityAction.DELETE ?? ActivityAction.UPDATE,
    message: 'Xóa camera setting',
    resource_type: 'camera_setting',
    resource_name: 'camera_setting',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this._service.remove(id);
    return { message: 'Camera setting deleted successfully' };
  }

  @Post(':cameraId/report-issue')
  @CameraSettingsSwagger.create
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @LogActivity({
    action: 'report_camera_issue',
    action_enum: ActivityAction.CREATE ?? ActivityAction.UPDATE,
    message: 'Báo lỗi camera',
    resource_type: 'camera',
    resource_name: 'camera_issue',
    resource_id: 'cameraId',
    severity: ActivitySeverity.MEDIUM,
  })
  async reportCameraIssue(
    @Param('cameraId', new ParseUUIDPipe({ version: '4' })) cameraId: string,
    @Body() body: { issue_type: string; description: string; severity: 'low' | 'medium' | 'high' },
    @Req() req: any,
  ) {
    // Build ticket payload and create via TicketsService
    const userId = getUserIdFromReq(req);
    const dto = {
      user_id: userId,
      title: `Camera Issue: ${body.issue_type}`,
      description: `Camera ID: ${cameraId}\nIssue: ${body.description}\nSeverity: ${body.severity}`,
      status: 'new',
      category: 'technical',
      metadata: { camera_id: cameraId },
    };

    const ticket = await this._ticketsService.create(dto as any);

    return {
      message: 'Camera issue reported successfully',
      ticket_created: true,
      ticket_id: (ticket as any).ticket_id,
      camera_id: cameraId,
      issue_type: body.issue_type,
    };
  }
}
