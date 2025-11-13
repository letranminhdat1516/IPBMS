import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { FcmModule } from '../fcm/fcm.module';
import { DeviceSyncGateway } from '../../shared/gateways/device-sync.gateway';
import { DeviceSyncService } from '../../shared/services/device-sync.service';
import { DeviceSyncController } from '../../presentation/controllers/devices/sync.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    FcmModule,
  ],
  controllers: [DeviceSyncController],
  providers: [DeviceSyncGateway, DeviceSyncService],
  exports: [DeviceSyncGateway, DeviceSyncService],
})
export class DeviceSyncModule {}
