import { Module } from '@nestjs/common';
import { PatientInfoService } from '../../application/services/patient-info.service';
import { PatientSupplementsService } from '../../application/services/patient-supplements.service';
import { UserDetailsService } from '../../application/services/user-details.service';
import { UsersService } from '../../application/services/users.service';
import { DoctorsService } from '../../application/services/users/doctors.service';
import { PatientMedicalRecordsService } from '../../application/services/users/patient-medical-records.service';
import { PatientSleepService } from '../../application/services/users/patient-sleep.service';
import { UserPreferencesService } from '../../application/services/users/user-preferences.service';
import { EventsRepository } from '../../infrastructure/repositories/events/events.repository';
import { EmergencyContactsRepository } from '../../infrastructure/repositories/users/emergency-contacts.repository';
import { PatientHabitsRepository } from '../../infrastructure/repositories/users/patient-habits.repository';
import { PatientMedicalRecordsRepository } from '../../infrastructure/repositories/users/patient-medical-records.repository';
import { PatientSupplementsRepository } from '../../infrastructure/repositories/users/patient-supplements.repository';
import { UserPreferencesRepository } from '../../infrastructure/repositories/users/user-preferences.repository';
import { UsersRepository } from '../../infrastructure/repositories/users/users.repository';
import { MeController } from '../../presentation/controllers/auth/me.controller';
import { DoctorsController } from '../../presentation/controllers/patients/doctors.controller';
import { PatientsInfoController } from '../../presentation/controllers/patients/info.controller';
import { PatientsController } from '../../presentation/controllers/patients/patients.controller';
import { PatientSupplementsController } from '../../presentation/controllers/patients/supplements.controller';
import { UserDetailsController } from '../../presentation/controllers/users/details.controller';
import { UsersController } from '../../presentation/controllers/users/users.controller';
import { NotificationService } from '../../shared/services/notification.service';
import { AccessControlModule } from '../access-control/access-control.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { CameraSettingsModule } from '../camera-settings/camera-settings.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { EmailTemplateModule } from '../email-templates/email-template.module';
import { EmailModule } from '../email/email.module';
import { QuotaModule } from '../quota/quota.module';
import { RepositoriesModule } from '../repositories.module';
import { AlertSettingsModule } from '../settings/alert-settings.module';
import { SettingsModule } from '../settings/settings.module';
import { SharedPermissionsModule } from '../shared-permissions/shared-permissions.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { SleepAutofillCron } from '../../workers/sleep-autofill.cron';

@Module({
  imports: [
    SettingsModule,
    EmailTemplateModule,
    EmailModule,
    CloudinaryModule,
    QuotaModule,
    SubscriptionModule,
    ActivityLogsModule,
    RepositoriesModule,
    AccessControlModule,
    SharedPermissionsModule,
    AlertSettingsModule,
    CameraSettingsModule,
  ],
  controllers: [
    UsersController,
    UserDetailsController,
    MeController,
    PatientsInfoController,
    PatientSupplementsController,
    DoctorsController,
    PatientsController,
  ],
  providers: [
    UsersRepository,
    UsersService,
    UserDetailsService,
    PatientMedicalRecordsService,
    EventsRepository,
    UserPreferencesRepository,
    UserPreferencesService,
    PatientSupplementsRepository,
    PatientMedicalRecordsRepository,
    EmergencyContactsRepository,
    PatientInfoService,
    PatientHabitsRepository,
    NotificationService,
    PatientSleepService,
    PatientSupplementsService,
    DoctorsService,
    SleepAutofillCron,
  ],
  exports: [UsersService, UsersRepository, NotificationService, PatientMedicalRecordsService],
})
export class UsersModule {}
