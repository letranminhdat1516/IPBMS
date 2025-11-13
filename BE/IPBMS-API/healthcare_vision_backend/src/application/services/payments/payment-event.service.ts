import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { safeEmitAsync, SafeEmitOptions } from '../../../shared/utils/safe-emit.util';

export interface PaymentFailedPayload {
  paymentId: string;
  userId: string;
  amount: number;
  planCode?: string | null;
  errorCode: string;
  transactionStatus: string;
}

@Injectable()
export class PaymentEventService {
  private readonly logger = new Logger(PaymentEventService.name);

  constructor(
    private readonly _emitter: EventEmitter2,
    private readonly _config: ConfigService,
  ) {}

  async handlePaymentSuccess(paymentId: string): Promise<void> {
    this.logger.log(`[handlePaymentSuccess] Broadcasting payment success for ${paymentId}`);
    // Use safeEmitAsync to await listeners but allow configuration via env
    const opts: SafeEmitOptions = {
      timeoutMs: Number(this._config.get('EVENT_EMIT_TIMEOUT_MS') ?? 2000),
      throwOnError: Boolean(this._config.get('EVENT_EMIT_THROW_ON_ERROR') ?? false),
    };
    try {
      await safeEmitAsync(this._emitter, 'payment.success', [paymentId], opts);
    } catch (err) {
      this.logger.error(`[handlePaymentSuccess] Listener error or timeout: ${String(err)}`);
      // If throwOnError is true, the error would have been thrown — in that case we bubble it
    }
  }

  async handlePaymentFailed(payload: PaymentFailedPayload): Promise<void> {
    this.logger.warn(
      `[handlePaymentFailed] Payment ${payload.paymentId} failed: ${payload.errorCode}-${payload.transactionStatus}`,
    );
    const failOpts: SafeEmitOptions = {
      timeoutMs: Number(this._config.get('EVENT_EMIT_TIMEOUT_MS') ?? 2000),
      throwOnError: Boolean(this._config.get('EVENT_EMIT_THROW_ON_ERROR') ?? false),
    };
    try {
      await safeEmitAsync(this._emitter, 'payment.failed', [payload], failOpts);
    } catch (err) {
      this.logger.error(`[handlePaymentFailed] Listener error or timeout: ${String(err)}`);
    }
  }

  async handlePaymentRetry(paymentId: string, retryCount: number): Promise<void> {
    this.logger.log(`[handlePaymentRetry] Payment ${paymentId} retry count: ${retryCount}`);
    const retryOpts: SafeEmitOptions = {
      timeoutMs: Number(this._config.get('EVENT_EMIT_TIMEOUT_MS') ?? 2000),
      throwOnError: Boolean(this._config.get('EVENT_EMIT_THROW_ON_ERROR') ?? false),
    };
    try {
      await safeEmitAsync(this._emitter, 'payment.retry', [paymentId, retryCount], retryOpts);
    } catch (err) {
      this.logger.error(`[handlePaymentRetry] Listener error or timeout: ${String(err)}`);
    }
  }
}
