import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Put,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UpdateSharedPermissionDto } from '../../../application/dto/shared-permissions/update-shared-permission.dto';
import { SharedPermissionsService } from '../../../application/services/shared-permissions.service';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { SharedPermissionsSwagger } from '../../../swagger/shared-permissions.swagger';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';

@ApiBearerAuth()
@ApiTags('permissions')
@Controller('customers/:customer_id/shared-permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer', 'admin')
export class SharedPermissionsController {
  private readonly logger = new Logger(SharedPermissionsController.name);
  constructor(private readonly _service: SharedPermissionsService) {}

  // -------- GET new: lấy 1 record theo customer + caregiver
  @Get(':caregiver_id')
  @SharedPermissionsSwagger.get
  async getOne(
    @Param('customer_id') customerId: string,
    @Param('caregiver_id') caregiverId: string,
  ) {
    this.logger.log(`[INPUT] customerId: ${customerId}, caregiverId: ${caregiverId}`);
    return this._service.getByCustomerAndCaregiver(customerId, caregiverId);
  }

  @Get()
  @SharedPermissionsSwagger.listByCustomer
  async listByCustomer(@Param('customer_id') customerId: string) {
    this.logger.log(`[INPUT] customerId: ${customerId}`);
    return this._service.getAllByCustomer(customerId);
  }

  @Put(':caregiver_id')
  @SharedPermissionsSwagger.update
  @LogActivity({
    action: 'update_shared_permissions',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật quyền chia sẻ dữ liệu cho caregiver',
    resource_type: 'shared_permission',
    resource_id: 'caregiver_id',
    resource_name: 'caregiver_id',
    severity: ActivitySeverity.MEDIUM,
  })
  async updatePermission(
    @Param('customer_id') customerId: string,
    @Param('caregiver_id') caregiverId: string,
    @Body() dto: UpdateSharedPermissionDto,
    @Req() req?: any,
  ) {
    this.logger.log(
      `[INPUT] customerId: ${customerId}, caregiverId: ${caregiverId}, dto: ${JSON.stringify(dto)}`,
    );

    // Enforce: only the customer who owns this resource (or admin) can update permissions
    const requester = req?.user;
    if (requester && requester.role === 'customer' && requester.userId !== customerId) {
      this.logger.warn(
        `Customer ${requester.userId} attempted to update permissions for ${customerId}`,
      );
      throw new ForbiddenException('Bạn không có quyền cập nhật quyền chia sẻ này');
    }

    return this._service.update(customerId, caregiverId, dto);
  }

  @Delete(':caregiver_id')
  @SharedPermissionsSwagger.remove
  @LogActivity({
    action: 'unassign_caregiver',
    action_enum: ActivityAction.DELETE,
    message: 'Huỷ quyền chia sẻ dữ liệu cho caregiver',
    resource_type: 'shared_permission',
    resource_id: 'caregiver_id',
    resource_name: 'caregiver_id',
    severity: ActivitySeverity.HIGH,
  })
  async removePermission(
    @Param('customer_id') customerId: string,
    @Param('caregiver_id') caregiverId: string,
    @Req() req?: any,
  ) {
    this.logger.log(`[INPUT] customerId: ${customerId}, caregiverId: ${caregiverId}`);

    const requester = req?.user;
    if (requester && requester.role === 'customer' && requester.userId !== customerId) {
      this.logger.warn(
        `Customer ${requester.userId} attempted to remove permissions for ${customerId}`,
      );
      throw new ForbiddenException('Bạn không có quyền huỷ quyền chia sẻ này');
    }

    return this._service.remove(customerId, caregiverId);
  }
}
