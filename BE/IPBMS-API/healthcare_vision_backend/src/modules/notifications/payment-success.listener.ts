import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AlertsService } from '../../application/services/alerts.service';
import { NotificationsService } from '../../application/services/notifications.service';
import { PaymentService } from '../../application/services/payments/payment.service';

@Injectable()
export class PaymentSuccessNotificationListener {
  private readonly logger = new Logger(PaymentSuccessNotificationListener.name);

  constructor(
    private readonly alertsService: AlertsService,
    private readonly notificationsService: NotificationsService,
    private readonly _paymentService: PaymentService,
  ) {}

  // Make the handler fire-and-forget so the event emitter won't wait on potentially
  // long DB operations (avoids safeEmitAsync timeouts). We still perform the work
  // in a background async task and log errors.
  @OnEvent('payment.success')
  handlePaymentSuccess(paymentId: string) {
    this.logger.debug(
      `[PaymentSuccessNotificationListener] Received payment.success event for ${paymentId} (scheduling background work)`,
    );

    // Fire-and-forget background task
    void (async () => {
      try {
        // Try to fetch payment + related transaction info for richer notification payload
        const info: any = await this._paymentService.debugCheckTransaction(paymentId);
        const payment = info?.payment ?? null;
        const transaction = info?.transaction ?? null;
        const userId = payment?.user_id || transaction?.subscriptions?.user_id || null;
        const plan =
          (payment && ((payment.delivery_data || {})?.plan_code || null)) ||
          transaction?.plan_code ||
          null;
        const amount = payment?.amount ?? transaction?.amount_total ?? null;

        if (!userId) {
          this.logger.warn(
            `[PaymentSuccessNotificationListener] No user found for payment ${paymentId}`,
          );
          return;
        }

        // Create an alert (info) for subscription activation
        try {
          await this.alertsService.create({
            event_id: paymentId,
            user_id: userId,
            alert_type: 'info',
            alert_message: `Đăng ký gói ${plan ?? 'mới'} thành công`,
            severity: 'low',
            alert_data: {
              payment_id: paymentId,
              plan_code: plan,
              amount,
            },
          });
        } catch (err) {
          this.logger.error(
            `[PaymentSuccessNotificationListener] Failed to create alert for ${paymentId}`,
            err instanceof Error ? err.stack : String(err),
          );
        }

        // Create a push notification record which will be forwarded to FCM by the notification listeners
        try {
          await this.notificationsService.create({
            user_id: userId,
            business_type: 'subscription',
            notification_type: 'push',
            message: `Đăng ký gói ${plan ?? 'mới'} thành công. Cảm ơn bạn đã sử dụng dịch vụ!`,
            delivery_data: {
              payment_id: paymentId,
              plan_code: plan,
              amount,
            },
          });
        } catch (err) {
          this.logger.error(
            `[PaymentSuccessNotificationListener] Failed to create notification for ${paymentId}`,
            err instanceof Error ? err.stack : String(err),
          );
        }
      } catch (err) {
        this.logger.error(
          `[PaymentSuccessNotificationListener] Error while processing payment success ${paymentId}:`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    })();
  }
}
