import { Module } from '@nestjs/common';
import { CamerasService } from '../../application/services/cameras.service';
import { CamerasRepository } from '../../infrastructure/repositories/devices/cameras.repository';
import { CamerasController } from '../../presentation/controllers/devices/cameras.controller';
import { QuotaModule } from '../quota/quota.module';
import { SharedPermissionsModule } from '../shared-permissions/shared-permissions.module';
import { AccessControlModule } from '../access-control/access-control.module';

@Module({
  imports: [QuotaModule, SharedPermissionsModule, AccessControlModule],
  controllers: [CamerasController],
  providers: [CamerasService, CamerasRepository],
  exports: [CamerasService],
})
export class CamerasModule {}
