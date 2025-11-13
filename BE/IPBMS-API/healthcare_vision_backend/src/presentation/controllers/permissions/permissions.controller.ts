import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { CreatePermissionDto } from '../../../application/dto/permissions/create-permission.dto';
import { PermissionsService } from '../../../application/services/permissions.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { PermissionsSwagger } from '../../../swagger/permissions.swagger';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiTags('permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @PermissionsSwagger.list
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const permissions = await this.permissionsService.findAll();
    return {
      success: true,
      data: limitNum ? permissions.slice(0, limitNum) : permissions,
      total: permissions.length,
      message: 'Permissions retrieved successfully',
    };
  }

  @Post()
  @PermissionsSwagger.create
  @LogActivity({
    action: 'create_permission',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo permission mới',
    resource_type: 'permission',
    resource_name: 'permission',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  async create(@Body() createPermissionDto: CreatePermissionDto) {
    return await this.permissionsService.create(createPermissionDto);
  }

  @Put(':id')
  @PermissionsSwagger.update
  @LogActivity({
    action: 'update_permission',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật permission',
    resource_type: 'permission',
    resource_name: 'permission',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async update(@Param('id') id: string, @Body() updatePermissionDto: CreatePermissionDto) {
    return await this.permissionsService.update(id, updatePermissionDto);
  }

  @Delete(':id')
  @PermissionsSwagger.remove
  @LogActivity({
    action: 'delete_permission',
    action_enum: ActivityAction.DELETE,
    message: 'Xoá permission',
    resource_type: 'permission',
    resource_name: 'permission',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  async remove(@Param('id') id: string) {
    return await this.permissionsService.remove(id);
  }
}
