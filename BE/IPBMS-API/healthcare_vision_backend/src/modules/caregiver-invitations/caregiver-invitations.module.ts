import { Module } from '@nestjs/common';
import { CaregiverInvitationsService } from '../../application/services/users/caregiver-invitations.service';
import { AssignmentsRepository } from '../../infrastructure/repositories/users/assignments.repository';
import { CaregiversTableRepository } from '../../infrastructure/repositories/users/caregivers-table.repository';
import { CaregiverInvitationsController } from '../../presentation/controllers/users/caregiver-invitations.controller';
import { AccessControlModule } from '../access-control/access-control.module';
import { NotificationPreferencesModule } from '../notification-preferences/notification-preferences.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule, AccessControlModule, NotificationsModule, NotificationPreferencesModule],
  controllers: [CaregiverInvitationsController],
  providers: [CaregiverInvitationsService, AssignmentsRepository, CaregiversTableRepository],
  exports: [CaregiverInvitationsService, AssignmentsRepository],
})
export class CaregiverInvitationsModule {}
