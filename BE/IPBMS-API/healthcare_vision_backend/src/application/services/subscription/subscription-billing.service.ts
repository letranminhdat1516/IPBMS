import { Injectable, Logger } from '@nestjs/common';
import { UnitOfWork } from '../../../infrastructure/database/unit-of-work.service';
import { TransactionRepository } from '../../../infrastructure/repositories/payments/transaction.repository';
import { SubscriptionEventRepository } from '../../../infrastructure/repositories/payments/subscription-event.repository';
import { Prisma } from '@prisma/client';

@Injectable()
export class SubscriptionBillingService {
  private readonly logger = new Logger(SubscriptionBillingService.name);

  constructor(
    private readonly _unitOfWork: UnitOfWork,
    private readonly _transactionRepo: TransactionRepository,
    private readonly _eventRepo: SubscriptionEventRepository,
  ) {}

  /**
   * Upgrade (event-driven) flow:
   * - record event in subscription_histories
   * - create transaction record (pending)
   * - optionally, if chargeNow=true and payment is simulated, mark tx succeeded and create invoice
   */
  async upgradeAndCharge(options: {
    subscriptionId: string;
    userId: string;
    oldPlanCode?: string;
    newPlanCode: string;
    amountTotal: number;
    currency: string;
    periodStart: Date;
    periodEnd: Date;
    chargeNow?: boolean; // if true, mark succeeded and create invoice
    provider?: string;
    providerPaymentId?: string;
    idempotencyKey?: string | null;
  }) {
    const {
      subscriptionId,
      userId,
      oldPlanCode,
      newPlanCode,
      amountTotal,
      currency,
      periodStart,
      periodEnd,
      chargeNow = false,
      provider,
      providerPaymentId,
      idempotencyKey,
    } = options;

    return await this._unitOfWork.execute(async (tx: Prisma.TransactionClient) => {
      // Idempotency: if idempotencyKey provided, check existing transaction first
      if (idempotencyKey) {
        const existingTx = await this._transactionRepo.findFirstInTransaction(tx, {
          subscription_id: subscriptionId,
          idempotency_key: idempotencyKey,
        } as any);
        if (existingTx) {
          // Try to find an existing event tied to this idempotency key
          const existedEvent = await this._eventRepo.findByEventDataPath(
            subscriptionId,
            'upgraded' as any,
            'idempotencyKey',
            idempotencyKey,
          );
          return {
            event: existedEvent,
            transaction: existingTx,
            invoiceId: existingTx.invoice_id || null,
          };
        }
      }

      // 1) Create subscription event (create-if-not-exists by idempotency key)
      const event = await this._eventRepo.createIfNotExistsByEventDataInTransaction(
        tx,
        subscriptionId,
        'upgraded' as any,
        'idempotencyKey',
        idempotencyKey || `${Date.now()}_${Math.random()}`,
        {
          subscription_id: subscriptionId,
          event_type: 'upgraded',
          event_data: {
            old_plan: oldPlanCode || null,
            new_plan: newPlanCode,
            triggered_by: userId,
            idempotencyKey: idempotencyKey || null,
          },
          old_plan_code: oldPlanCode || null,
          new_plan_code: newPlanCode,
          triggered_by: userId,
        } as any,
      );

      // 2) Create transaction (pending)
      const txRecord = await this._transactionRepo.createInTransaction(tx, {
        subscription_id: subscriptionId,
        plan_code: newPlanCode,
        plan_snapshot: {},
        amount_subtotal: BigInt(amountTotal.toString()),
        amount_discount: BigInt('0'),
        amount_tax: BigInt('0'),
        amount_total: BigInt(amountTotal.toString()),
        currency,
        period_start: periodStart,
        period_end: periodEnd,
        effective_action: 'upgrade',
        status: chargeNow ? ('paid' as any) : ('open' as any),
        provider: provider || null,
        provider_payment_id: providerPaymentId || null,
        idempotency_key: idempotencyKey || null,
        related_tx_id: null,
        notes: null,
      } as any);

      return {
        event,
        transaction: txRecord,
        invoiceId: null, // Invoice functionality moved to transactions table
      };
    });
  }
}
