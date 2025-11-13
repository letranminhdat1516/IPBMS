import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { CreateRoleDto } from '../../../application/dto/roles/create-role.dto';
import { RolesService } from '../../../application/services/roles.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { RolesSwagger } from '../../../swagger/roles.swagger';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Optional max number of roles to return',
  })
  @RolesSwagger.list
  async findAll(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const roles = await this.rolesService.findAll();
    // Ensure permission count fields exist for frontend consumers and add a display label
    const enriched = (roles as any[]).map((r) => {
      const count =
        r.permission_count ??
        r.permissions_count ??
        (Array.isArray(r.permissions) ? r.permissions.length : 0);
      return {
        ...r,
        permission_count: count,
        permissions_count: count,
        // Compatibility label often shown in UI components
        permissions_label: `${count} ${count === 1 ? 'permission' : 'permissions'}`,
      };
    });

    return {
      success: true,
      data: limitNum ? enriched.slice(0, limitNum) : enriched,
      total: enriched.length,
      message: 'Roles retrieved successfully',
    };
  }

  @Get(':id')
  @RolesSwagger.byId
  async findOne(@Param('id') id: string) {
    const role = await this.rolesService.findRoleWithPermissions(id);
    if (!role) {
      return {
        success: false,
        message: 'Role not found',
      };
    }

    const count =
      (role as any).permission_count ??
      (role as any).permissions_count ??
      (Array.isArray((role as any).permissions) ? (role as any).permissions.length : 0);

    return {
      success: true,
      data: {
        ...role,
        permission_count: count,
        permissions_count: count,
        permissions_label: `${count} ${count === 1 ? 'permission' : 'permissions'}`,
      },
      message: 'Role retrieved successfully',
    };
  }

  @Post()
  @RolesSwagger.create
  @LogActivity({
    action: 'create_role',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo vai trò mới',
    resource_type: 'role',
    severity: ActivitySeverity.LOW,
  })
  async create(@Body() createRoleDto: CreateRoleDto) {
    return await this.rolesService.create(createRoleDto);
  }

  @Put(':id')
  @RolesSwagger.update
  @LogActivity({
    action: 'update_role',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật vai trò',
    resource_type: 'role',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async update(@Param('id') id: string, @Body() updateRoleDto: CreateRoleDto) {
    return await this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @RolesSwagger.remove
  @LogActivity({
    action: 'delete_role',
    action_enum: ActivityAction.DELETE,
    message: 'Xoá vai trò',
    resource_type: 'role',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  async remove(@Param('id') id: string) {
    return await this.rolesService.remove(id);
  }
}
