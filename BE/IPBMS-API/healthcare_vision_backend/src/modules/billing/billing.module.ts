import { Module } from '@nestjs/common';
import { PaymentReconciliationService } from '../../application/services/payment-reconciliation.service';
import { SubscriptionBillingService } from '../../application/services/subscription';
import { TransactionService } from '../../application/services/transaction.service';
import { WebhookController } from '../../presentation/controllers/external/webhook.controller';
import { TransactionController } from '../../presentation/controllers/payments/transactions.controller';
import { AlertsModule } from '../alerts/alerts.module';
import { CacheModule } from '../cache/cache.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentModule } from '../payment/payment.module';
import { RepositoriesModule } from '../repositories.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { VnpayModule } from '../vnpay/vnpay.module';

/**
 * Billing Module
 *
 * Module quản lý thanh toán và giao dịch.
 *
 * Thay đổi quan trọng (Transition từ License-based sang Subscription-based):
 * - Loại bỏ LicenseQuotaService và các dependencies liên quan đến license
 * - Sử dụng PaymentService với logic tạo subscription thay vì license
 * - Quota được tính dựa trên subscription active của user thay vì license activation
 * - Đơn giản hóa kiến trúc bằng cách loại bỏ các entity không cần thiết
 */

@Module({
  imports: [
    VnpayModule,
    RepositoriesModule,
    CacheModule,
    AlertsModule,
    NotificationsModule,
    SubscriptionModule,
    PaymentModule,
  ],
  controllers: [TransactionController, WebhookController],
  providers: [TransactionService, PaymentReconciliationService, SubscriptionBillingService],
  exports: [TransactionService, PaymentReconciliationService, SubscriptionBillingService],
})
export class BillingModule {}
