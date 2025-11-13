import { Module } from '@nestjs/common';
import { AccessControlService } from '../../application/services/access-control.service';
import { AccessControlRepository } from '../../infrastructure/repositories/shared/access-control.repository';

@Module({
  providers: [AccessControlRepository, AccessControlService],
  exports: [AccessControlRepository, AccessControlService],
})
export class AccessControlModule {}
