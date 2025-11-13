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
import { SharedPermissionsService } from '../../../application/services/shared-permissions.service';
import { UpdateSharedPermissionDto } from '../../../application/dto/shared-permissions/update-shared-permission.dto';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { SharedPermissionsSwagger } from '../../../swagger/shared-permissions.swagger';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';

@ApiBearerAuth()
@ApiTags('caregiver-shared-permissions')
@Controller('caregivers/:caregiver_id/shared-permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer', 'caregiver', 'admin')
export class CaregiverSharedPermissionsController {
  private readonly logger = new Logger(CaregiverSharedPermissionsController.name);
  constructor(private readonly _service: SharedPermissionsService) {}

  @Get()
  @SharedPermissionsSwagger.listByCaregiver
  async listByCaregiver(@Param('caregiver_id') caregiverId: string, @Req() req?: any) {
    this.logger.log(`[INPUT] caregiverId: ${caregiverId}`);

    // Enforce: only the caregiver who owns this resource (or admin) can view permissions
    const requester = req?.user;
    if (requester && requester.role === 'caregiver' && requester.userId !== caregiverId) {
      this.logger.warn(
        `Caregiver ${requester.userId} attempted to access permissions for ${caregiverId}`,
      );
      throw new ForbiddenException('Bạn không có quyền truy cập quyền chia sẻ này');
    }

    return this._service.getAllForCaregiver(caregiverId);
  }

  @Get(':customer_id')
  @SharedPermissionsSwagger.get
  async getPermissionWithCustomer(
    @Param('caregiver_id') caregiverId: string,
    @Param('customer_id') customerId: string,
    @Req() req?: any,
  ) {
    this.logger.log(`[INPUT] caregiverId: ${caregiverId}, customerId: ${customerId}`);

    // Enforce: caregiver can only view their own permissions, customer can view their granted permissions
    const requester = req?.user;
    if (requester && requester.role === 'caregiver' && requester.userId !== caregiverId) {
      this.logger.warn(
        `Caregiver ${requester.userId} attempted to access permissions for ${caregiverId}`,
      );
      throw new ForbiddenException('Bạn không có quyền truy cập quyền chia sẻ này');
    }
    if (requester && requester.role === 'customer' && requester.userId !== customerId) {
      this.logger.warn(
        `Customer ${requester.userId} attempted to access permissions for ${customerId}`,
      );
      throw new ForbiddenException('Bạn không có quyền truy cập quyền chia sẻ này');
    }

    return this._service.getByCustomerAndCaregiver(customerId, caregiverId);
  }

  @Put(':customer_id')
  @SharedPermissionsSwagger.update
  @LogActivity({
    action: 'caregiver_update_shared_permissions',
    action_enum: ActivityAction.UPDATE,
    message: 'Caregiver cập nhật quyền chia sẻ dữ liệu với customer',
    resource_type: 'shared_permission',
    resource_id: 'customer_id',
    resource_name: 'customer_id',
    severity: ActivitySeverity.MEDIUM,
  })
  async updatePermissionWithCustomer(
    @Param('caregiver_id') caregiverId: string,
    @Param('customer_id') customerId: string,
    @Body() updateDto: UpdateSharedPermissionDto,
    @Req() req?: any,
  ) {
    this.logger.log(
      `[INPUT] caregiverId: ${caregiverId}, customerId: ${customerId}, permissions:`,
      updateDto,
    );

    // Enforce: only the caregiver who owns this resource (or admin) can update permissions
    const requester = req?.user;
    if (requester && requester.role === 'caregiver' && requester.userId !== caregiverId) {
      this.logger.warn(
        `Caregiver ${requester.userId} attempted to update permissions for ${caregiverId}`,
      );
      throw new ForbiddenException('Bạn không có quyền cập nhật quyền chia sẻ này');
    }

    return this._service.update(customerId, caregiverId, updateDto);
  }

  @Delete(':customer_id')
  @SharedPermissionsSwagger.remove
  @LogActivity({
    action: 'caregiver_remove_shared_permissions',
    action_enum: ActivityAction.DELETE,
    message: 'Caregiver huỷ quyền chia sẻ dữ liệu với customer',
    resource_type: 'shared_permission',
    resource_id: 'customer_id',
    resource_name: 'customer_id',
    severity: ActivitySeverity.HIGH,
  })
  async removePermissionWithCustomer(
    @Param('caregiver_id') caregiverId: string,
    @Param('customer_id') customerId: string,
    @Req() req?: any,
  ) {
    this.logger.log(`[INPUT] caregiverId: ${caregiverId}, customerId: ${customerId} - REMOVING`);

    // Enforce: only the caregiver who owns this resource (or admin) can remove permissions
    const requester = req?.user;
    if (requester && requester.role === 'caregiver' && requester.userId !== caregiverId) {
      this.logger.warn(
        `Caregiver ${requester.userId} attempted to remove permissions for ${caregiverId}`,
      );
      throw new ForbiddenException('Bạn không có quyền huỷ quyền chia sẻ này');
    }

    return this._service.remove(customerId, caregiverId);
  }
}
