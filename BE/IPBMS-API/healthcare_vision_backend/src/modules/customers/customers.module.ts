import { Module } from '@nestjs/common';
import { CustomersController } from '../../presentation/controllers/users/customers.controller';
import { CaregiverInvitationsModule } from '../caregiver-invitations/caregiver-invitations.module';

@Module({
  imports: [CaregiverInvitationsModule],
  controllers: [CustomersController],
})
export class CustomersModule {}
