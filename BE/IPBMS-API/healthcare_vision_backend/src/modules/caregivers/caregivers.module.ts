import { Module } from '@nestjs/common';
import { CaregiversService } from '../../application/services/caregivers.service';
import { CaregiversRepository } from '../../infrastructure/repositories/users/caregivers.repository';
import { UsersRepository } from '../../infrastructure/repositories/users/users.repository';
import { CaregiversController } from '../../presentation/controllers/users/caregivers.controller';
import { CaregiverInvitationsModule } from '../caregiver-invitations/caregiver-invitations.module';

@Module({
  imports: [CaregiverInvitationsModule],
  controllers: [CaregiversController],
  providers: [CaregiversRepository, UsersRepository, CaregiversService],
  exports: [CaregiversService, CaregiversRepository],
})
export class CaregiversModule {}
