// src/payment.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentEventService } from '../../application/services/payment-event.service';
import { PaymentService } from '../../application/services/payment.service';
import { PaymentRepository } from '../../infrastructure/repositories/payments/payment.repository';
import { PaymentController } from '../../presentation/controllers/payments/payment.controller';
import { CacheModule } from '../cache/cache.module';
import { VnpayModule } from '../vnpay/vnpay.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), VnpayModule, CacheModule],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRepository, PaymentEventService],
  exports: [PaymentService, PaymentEventService],
})
export class PaymentModule {}
