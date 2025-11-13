import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateCameraDto } from '../../../application/dto/cameras/create-camera.dto';
import { UpdateCameraDto } from '../../../application/dto/cameras/update-camera.dto';
import { CamerasService } from '../../../application/services/devices';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { SharedPermission } from '../../../shared/decorators/shared-permission.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { SharedPermissionGuard } from '../../../shared/guards/shared-permission.guard';
import { createForbiddenException } from '../../../shared/utils';
import { CamerasSwagger } from '../../../swagger/cameras.swagger';

@ApiTags('cameras')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@Controller('cameras')
export class CamerasController {
  constructor(private readonly cameras: CamerasService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'reportedOnly',
    required: false,
    description: 'If true, only reported cameras',
  })
  @CamerasSwagger.list
  @Roles('admin') // Only admin can list all cameras
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('reportedOnly') reportedOnly?: string,
  ) {
    return this.cameras.list({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      reportedOnly: reportedOnly === 'true',
    });
  }

  @Get('by-user/:user_id')
  @CamerasSwagger.listByUser
  @UseGuards(SharedPermissionGuard)
  @SharedPermission('stream:view') // 👈 caregiver cần quyền stream:view
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listByUserId(
    @Param('user_id') user_id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cameras.listByUserId(user_id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':camera_id')
  @CamerasSwagger.getById
  @UseGuards(SharedPermissionGuard)
  @SharedPermission('stream:view') // 👈 caregiver cần quyền
  async getById(@Param('camera_id') camera_id: string) {
    return this.cameras.getById(camera_id);
  }

  @Get(':camera_id/events')
  @CamerasSwagger.events
  @UseGuards(SharedPermissionGuard)
  @SharedPermission('stream:view') // 👈 xem event cũng cần quyền stream
  async events(
    @Param('camera_id') camera_id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('orderBy') orderBy?: 'detected_at' | 'confidence_score',
    @Query('order') order?: 'ASC' | 'DESC',
  ) {
    return this.cameras.listEvents(camera_id, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      dateFrom,
      dateTo,
      status: status ? status.split(',') : undefined,
      type: type ? type.split(',') : undefined,
      severity: severity ? (severity.split(',') as any) : undefined,
      orderBy: orderBy || 'detected_at',
      order: order || 'DESC',
    });
  }

  @Post()
  @CamerasSwagger.create
  @LogActivity({
    action: 'create_camera',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo camera mới',
    resource_type: 'camera',
    resource_name: 'camera',
    severity: ActivitySeverity.MEDIUM,
  })
  async create(@Body() createCameraDto: CreateCameraDto, @Req() req: any) {
    return this.cameras.createCamera(createCameraDto, req.user);
  }

  @Put(':camera_id')
  @CamerasSwagger.update
  @UseGuards(SharedPermissionGuard)
  @SharedPermission('stream:edit')
  @LogActivity({
    action: 'update_camera',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật camera',
    resource_type: 'camera',
    resource_name: 'camera',
    resource_id: 'camera_id',
    severity: ActivitySeverity.MEDIUM,
  })
  async update(
    @Param('camera_id') camera_id: string,
    @Body() updateCameraDto: UpdateCameraDto,
    @Req() req: any,
  ) {
    const user_id = req.user?.user_id;
    const updated = await this.cameras.updateCamera(camera_id, updateCameraDto, user_id);
    return { success: true, message: 'Đã cập nhật camera', data: updated };
  }

  @Patch(':camera_id')
  @CamerasSwagger.update // Reuse update swagger
  @UseGuards(SharedPermissionGuard)
  @SharedPermission('stream:edit')
  @LogActivity({
    action: 'patch_camera',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật một phần camera',
    resource_type: 'camera',
    resource_name: 'camera',
    resource_id: 'camera_id',
    severity: ActivitySeverity.MEDIUM,
  })
  async patch(
    @Param('camera_id') camera_id: string,
    @Body() updateCameraDto: UpdateCameraDto,
    @Req() req: any,
  ) {
    const user_id = req.user?.user_id;
    const updated = await this.cameras.updateCamera(camera_id, updateCameraDto, user_id);
    return { success: true, message: 'Đã cập nhật camera', data: updated };
  }

  @Delete(':camera_id')
  @CamerasSwagger.delete
  @LogActivity({
    action: 'delete_camera',
    action_enum: ActivityAction.DELETE,
    message: 'Xóa camera',
    resource_type: 'camera',
    resource_name: 'camera',
    resource_id: 'camera_id',
    severity: ActivitySeverity.HIGH,
  })
  async remove(@Param('camera_id') camera_id: string, @Req() req?: any) {
    const cam = await this.cameras.getById(camera_id);
    if (!cam) return { success: false };
    const role = req?.user?.role;
    if (role === 'caregiver') {
      throw createForbiddenException(
        'Caregiver không được phép xóa camera',
        'CAREGIVER_DELETE_FORBIDDEN',
      );
    }
    return this.cameras.delete(camera_id);
  }

  @Get(':camera_id/issues')
  @UseGuards(SharedPermissionGuard)
  @SharedPermission('stream:view')
  async getCameraIssues(@Param('camera_id') camera_id: string) {
    return this.cameras.getCameraIssues(camera_id);
  }
}
