import { Module } from '@nestjs/common';
import { EmergencyContactsController } from '../../presentation/controllers/users/emergency-contacts.controller';
import { EmergencyContactsService } from '../../application/services/emergency-contacts.service';
import { EmergencyContactsRepository } from '../../infrastructure/repositories/users/emergency-contacts.repository';
import { UnitOfWork } from '../../infrastructure/database/unit-of-work.service';

@Module({
  controllers: [EmergencyContactsController],
  providers: [EmergencyContactsService, EmergencyContactsRepository, UnitOfWork],
  exports: [EmergencyContactsService, EmergencyContactsRepository],
})
export class EmergencyContactsModule {}
