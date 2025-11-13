import { Module } from '@nestjs/common';
import { FirebaseAdminService } from '../../shared/providers/firebase.provider';

export const FIREBASE_APP = 'FIREBASE_APP';
export const FIREBASE_MESSAGING = 'FIREBASE_MESSAGING';
export const FIREBASE_AUTH = 'FIREBASE_AUTH';

@Module({
  providers: [
    FirebaseAdminService,
    {
      provide: FIREBASE_APP,
      inject: [FirebaseAdminService],
      useFactory: (svc: FirebaseAdminService) => svc.getApp(),
    },
    {
      provide: FIREBASE_MESSAGING,
      inject: [FirebaseAdminService],
      useFactory: (svc: FirebaseAdminService) => {
        try {
          return svc.getMessaging();
        } catch {
          // Firebase not initialized -> provide null to downstream consumers
          return null;
        }
      },
    },
    {
      provide: FIREBASE_AUTH,
      inject: [FirebaseAdminService],
      useFactory: (svc: FirebaseAdminService) => {
        try {
          return svc.getAuthClient();
        } catch {
          // Firebase not initialized -> provide null to downstream consumers
          return null;
        }
      },
    },
  ],
  exports: [FirebaseAdminService, FIREBASE_APP, FIREBASE_MESSAGING, FIREBASE_AUTH],
})
export class FirebaseModule {}
