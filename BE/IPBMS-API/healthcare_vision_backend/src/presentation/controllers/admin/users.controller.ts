import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Quota } from '../../../infrastructure/repositories/admin/quota.repository';
import { AdminUsersService } from '../../../application/services/admin';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { AdminUsersSwagger } from '../../../swagger/admin-users.swagger';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivitySeverity, ActivityAction } from '../../../core/entities/activity_logs.entity';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiTags('admin')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get(':id/quota')
  @AdminUsersSwagger.getQuota
  async getQuota(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.adminUsersService.getQuota(id);
  }

  @Put(':id/quota')
  @AdminUsersSwagger.updateQuota
  @LogActivity({
    action: 'update_user_quota',
    action_enum: ActivityAction.UPDATE,
    message: 'Admin cập nhật quota cho user',
    resource_type: 'user_quota',
    resource_name: 'user_quota',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async updateQuota(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body('quota') quota: number,
  ) {
    return this.adminUsersService.updateQuota(id, quota);
  }

  @Delete(':id/quota')
  @AdminUsersSwagger.deleteQuota
  @LogActivity({
    action: 'delete_user_quota',
    action_enum: ActivityAction.DELETE ?? ActivityAction.UPDATE,
    message: 'Admin xóa quota của user',
    resource_type: 'user_quota',
    resource_name: 'user_quota',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  async deleteQuota(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.adminUsersService.deleteQuota(id);
  }

  @Get(':id/plan')
  @AdminUsersSwagger.getPlan
  async getPlan(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.adminUsersService.getPlan(id);
  }

  @Put(':id/plan')
  @AdminUsersSwagger.updatePlan
  @LogActivity({
    action: 'update_user_plan',
    action_enum: ActivityAction.UPDATE,
    message: 'Admin cập nhật plan cho user',
    resource_type: 'user_plan',
    resource_name: 'user_plan',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async updatePlan(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body('plan') plan: Partial<Quota>,
  ) {
    return this.adminUsersService.updatePlan(id, plan);
  }
}
