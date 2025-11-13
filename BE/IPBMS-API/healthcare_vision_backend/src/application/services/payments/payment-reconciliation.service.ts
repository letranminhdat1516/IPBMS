import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PaymentRepository } from '../../../infrastructure/repositories/payments/payment.repository';
import { PaymentEventService } from './payment-event.service';
import { PaymentService } from './payment.service';
import { CacheService } from '../cache.service';

@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger(PaymentReconciliationService.name);

  constructor(
    private readonly _prisma: PrismaService,
    private readonly _paymentRepo: PaymentRepository,
    private readonly _paymentEventService: PaymentEventService,
    private readonly _paymentService: PaymentService,
    private readonly _cacheService: CacheService,
  ) {}

  /**
   * Run every 5 minutes to reconcile paid payments with transactions
   */
  async reconcilePaidPayments() {
    this.logger.log('[reconcilePaidPayments] Start reconciliation job');
    try {
      // Load recently paid payments and attempt to reconcile via transactions.payment_id (new 1-1 mapping)
      const paidPayments = await this._prisma.payments.findMany({
        where: { status: 'paid' },
        orderBy: { created_at: 'desc' },
        take: 200,
      });

      for (const p of paidPayments) {
        try {
          // Find transaction by explicit mapping payment_id or legacy provider_payment_id
          const tx = await this._paymentRepo.findTransactionByPaymentId(p.payment_id);
          if (!tx) {
            this.logger.warn(
              `[reconcilePaidPayments] No transaction linked for payment ${p.payment_id}`,
            );
            continue;
          }

          if (String(tx.status) === 'paid') {
            continue; // already applied
          }

          this.logger.log(
            `[reconcilePaidPayments] Found paid payment ${p.payment_id} with pending tx ${tx.tx_id} - attempting post-processing`,
          );

          // Delegate to payment event handler which will call subscription service
          try {
            await this._paymentEventService.handlePaymentSuccess(p.payment_id);
            this.logger.log(`[reconcilePaidPayments] Successfully applied payment ${p.payment_id}`);
          } catch (err) {
            this.logger.error(
              `[reconcilePaidPayments] Failed to apply payment ${p.payment_id}:`,
              err,
            );
          }
        } catch (err) {
          this.logger.error('[reconcilePaidPayments] Error processing payment item:', err);
        }
      }

      this.logger.log('[reconcilePaidPayments] Reconciliation job finished');
    } catch (err) {
      this.logger.error('[reconcilePaidPayments] Unexpected error:', err);
    }
  }

  /**
   * Query VNPay for pending payments older than 10 minutes to update their status
   */
  async queryOldPendingPayments() {
    this.logger.log('[queryOldPendingPayments] Start query for old pending payments');
    try {
      // Global cooldown: if VNPay endpoint has reported TLS cert issues recently, skip this job
      const GLOBAL_KEY = 'vnp:global:cert_error';
      const globalFlag = await this._cacheService.get(GLOBAL_KEY);
      if (globalFlag) {
        this.logger.warn(
          '[queryOldPendingPayments] Skipping job because VNPay global cert error flag is set',
        );
        return;
      }

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const pendings = await this._prisma.payments.findMany({
        where: {
          status: 'pending',
          created_at: { lt: tenMinutesAgo },
        },
        orderBy: { created_at: 'asc' },
        take: 100,
      });

      for (const p of pendings) {
        try {
          const cacheKey = `querydr:${p.payment_id}`;
          const last = await this._cacheService.get(cacheKey);
          if (last) {
            this.logger.debug(
              `[queryOldPendingPayments] Skipping recently queried ${p.payment_id}`,
            );
            continue;
          }

          this.logger.log(`[queryOldPendingPayments] Querying VNPay for payment ${p.payment_id}`);
          try {
            const res = await this._paymentService.queryDr(p.payment_id, '127.0.0.1');
            this.logger.debug('[queryOldPendingPayments] queryDr result:', res);
            // If VNPay TLS certificate issue detected, set a global cooldown to avoid repeated failing calls
            if (res && (res as any).errorCode === 'CERT_HAS_EXPIRED') {
              // Only set global cooldown in non-sandbox environments. To disable in sandbox set
              // VNP_ENABLE_GLOBAL_COOLDOWN=false in env.
              const enabled = String(
                process.env.VNP_ENABLE_GLOBAL_COOLDOWN ?? 'true',
              ).toLowerCase();
              if (enabled !== 'false') {
                try {
                  const TTL = Number(process.env.VNP_GLOBAL_COOLDOWN_SEC || 1800); // default 30 minutes
                  await this._cacheService.set(GLOBAL_KEY, '1', { ttl: TTL });
                  this.logger.warn(
                    `[queryOldPendingPayments] Detected VNPay CERT_HAS_EXPIRED - set global cooldown for ${TTL}s`,
                  );
                } catch (e) {
                  this.logger.error(
                    '[queryOldPendingPayments] Failed to set global cooldown cache',
                    e,
                  );
                }
              } else {
                this.logger.warn(
                  '[queryOldPendingPayments] Detected VNPay CERT_HAS_EXPIRED but global cooldown disabled via VNP_ENABLE_GLOBAL_COOLDOWN=false',
                );
              }
              // Skip marking this payment as processed so it can be retried after cooldown if desired
            }
            // Set cache to avoid frequent queries
            await this._cacheService.set(cacheKey, '1', { ttl: 60 });
          } catch (err) {
            this.logger.error(`[queryOldPendingPayments] queryDr failed for ${p.payment_id}:`, err);
          }
        } catch (err) {
          this.logger.error('[queryOldPendingPayments] Error processing pending payment:', err);
        }
      }

      this.logger.log('[queryOldPendingPayments] Finished');
    } catch (err) {
      this.logger.error('[queryOldPendingPayments] Unexpected error:', err);
    }
  }
}
