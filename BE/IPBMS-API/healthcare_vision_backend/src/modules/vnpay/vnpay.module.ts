import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VNPAY_CLIENT, VnpayProvider } from '../../shared/providers/vnpay.provider';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [VnpayProvider],
  exports: [VnpayProvider, VNPAY_CLIENT],
})
export class VnpayModule {}
