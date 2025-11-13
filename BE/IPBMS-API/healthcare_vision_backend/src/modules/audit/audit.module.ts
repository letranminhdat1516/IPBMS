import { Module } from '@nestjs/common';
import { AuditService } from '../../application/services/audit.service';
import { AuditRepository } from '../../infrastructure/repositories/shared/audit.repository';
import { AuditController } from '../../presentation/controllers/system/audit.controller';

@Module({
  imports: [],
  controllers: [AuditController],
  providers: [AuditService, AuditRepository],
  exports: [AuditService],
})
export class AuditModule {}
