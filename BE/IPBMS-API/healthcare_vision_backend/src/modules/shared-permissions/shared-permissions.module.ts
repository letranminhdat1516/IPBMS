import { Module } from '@nestjs/common';
import { PermissionRequestsService } from '../../application/services/permissions/permission-requests.service';
import { SharedPermissionsService } from '../../application/services/shared/shared-permissions.service';
import { SharedPermissionsRepository } from '../../infrastructure/repositories/permissions/shared-permissions.repository';
import { CaregiverSharedPermissionsController } from '../../presentation/controllers/permissions/caregiver-shared.controller';
import { PermissionRequestsController } from '../../presentation/controllers/permissions/requests.controller';
import { SharedPermissionsController } from '../../presentation/controllers/permissions/shared.controller';
import { AccessControlModule } from '../access-control/access-control.module';

@Module({
  imports: [AccessControlModule],
  controllers: [
    PermissionRequestsController,
    SharedPermissionsController,
    CaregiverSharedPermissionsController,
  ],
  providers: [SharedPermissionsRepository, SharedPermissionsService, PermissionRequestsService],
  exports: [SharedPermissionsService, PermissionRequestsService],
})
export class SharedPermissionsModule {}
