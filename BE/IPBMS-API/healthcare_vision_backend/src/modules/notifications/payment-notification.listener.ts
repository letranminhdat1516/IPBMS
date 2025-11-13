import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AlertsService } from '../../application/services/alerts.service';
import { NotificationsService } from '../../application/services/notifications.service';
import { ActivityLogsService } from '../../application/services/shared/activity-logs.service';
import { ActivitySeverity } from '../../core/entities/activity_logs.entity';
import { PaymentFailedPayload } from '../../application/services/payments/payment-event.service';

@Injectable()
export class PaymentNotificationListener {
  private readonly logger = new Logger(PaymentNotificationListener.name);

  constructor(
    private readonly alertsService: AlertsService,
    private readonly notificationsService: NotificationsService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  // Make the failure handler non-blocking so that event emission won't timeout.
  @OnEvent('payment.failed')
  handlePaymentFailed(payload: PaymentFailedPayload) {
    this.logger.debug(
      `[PaymentNotificationListener] Received payment.failed for ${payload.paymentId} (scheduling background work)`,
    );

    void (async () => {
      try {
        await this.alertsService.create({
          event_id: payload.paymentId,
          user_id: payload.userId,
          alert_type: 'warning',
          alert_message: `Thanh toán ${payload.paymentId} với số tiền ${payload.amount} VND đã thất bại. Mã lỗi: ${payload.errorCode}, Trạng thái: ${payload.transactionStatus}`,
          severity: 'high',
          alert_data: {
            payment_id: payload.paymentId,
            plan_code: payload.planCode,
            amount: payload.amount,
            error_code: payload.errorCode,
            transaction_status: payload.transactionStatus,
          },
        });
      } catch (error) {
        this.logger.error(
          `[PaymentNotificationListener] Failed to create payment failure alert for ${payload.paymentId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }

      try {
        await this.notificationsService.create({
          user_id: payload.userId,
          business_type: 'system_update',
          notification_type: 'push',
          message: `Thanh toán cho gói ${payload.planCode ?? 'chưa xác định'} đã thất bại. Vui lòng thử lại hoặc liên hệ hỗ trợ.`,
          delivery_data: {
            payment_id: payload.paymentId,
            plan_code: payload.planCode,
            amount: payload.amount,
          },
        });
      } catch (error) {
        this.logger.error(
          `[PaymentNotificationListener] Failed to create payment failure notification for ${payload.paymentId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }

      // Persist an audit/activity log for this failure (if activity logging enabled)
      try {
        await this.activityLogs.create({
          actor_id: payload.userId,
          actor_name: payload.userId,
          action: 'payment_failed',
          resource_type: 'payment',
          resource_id: payload.paymentId,
          resource_name: payload.planCode ?? 'unknown',
          message: `Payment ${payload.paymentId} failed for user ${payload.userId}. Error: ${payload.errorCode}`,
          severity: ActivitySeverity.HIGH,
          meta: {
            payment_id: payload.paymentId,
            plan_code: payload.planCode,
            amount: payload.amount,
            error_code: payload.errorCode,
            transaction_status: payload.transactionStatus,
          },
        });
      } catch (err) {
        this.logger.error(
          `[PaymentNotificationListener] Failed to write activity log for payment ${payload.paymentId}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    })();
  }
}
