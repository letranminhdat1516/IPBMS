import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from '../../application/services/auth.service';
import { SessionService } from '../../application/services/session.service';
import { createJwtConfig } from '../../config/jwt.config';
import { JwtStrategy } from '../../infrastructure/auth/jwt.strategy';
import { TwilioSmsService } from '../../infrastructure/external-apis/twilio/twilio-sms.service';
import { AuthController } from '../../presentation/controllers/auth/auth.controller';
import { CaregiverInvitationsModule } from '../caregiver-invitations/caregiver-invitations.module';
import { FcmModule } from '../fcm/fcm.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { SharedModule } from '../shared-otp/shared-otp.module';
import { SharedPermissionsModule } from '../shared-permissions/shared-permissions.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { TwilioModule } from '../twilio/twilio.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    JwtModule.registerAsync({ useFactory: createJwtConfig, inject: [ConfigService] }),
    SharedModule,
    UsersModule,
    FirebaseModule,
    CaregiverInvitationsModule,
    FcmModule,
    TwilioModule,
    SharedPermissionsModule,
    SubscriptionModule,
  ],
  providers: [AuthService, SessionService, JwtStrategy, TwilioSmsService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
