import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import dayjs from 'dayjs';
import tz from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { PaymentService } from '../../application/services/payment.service';
import { SubscriptionService } from '../../application/services/subscription';
import { SystemConfigService } from '../../application/services/system/system-config.service';
import { NotificationService } from '../../shared/services/notification.service';
import { PrismaService } from '../database/prisma.service';

dayjs.extend(utc);
dayjs.extend(tz);

@Injectable()
export class SubscriptionRenewalCron {
  private readonly logger = new Logger(SubscriptionRenewalCron.name);
  private isRunning = false;

  constructor(
    private readonly _subscriptionService: SubscriptionService,
    private readonly _paymentService: PaymentService,
    private readonly _systemSettingsService: SystemConfigService,
    private readonly _prismaService: PrismaService,
    private readonly _notificationService: NotificationService,
  ) {}

  // Chạy mỗi giờ để xử lý auto-renewal và dunning retries
  @Cron('0 * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async handleAutoRenewal() {
    // Check system config to enable/disable auto-renewal
    const enabled = await this._systemSettingsService.getBoolean('billing.auto_renew_enabled');
    if (!enabled) {
      this.logger.warn('Auto-renewal cron disabled by system configuration.');
      return;
    }

    if (this.isRunning) {
      this.logger.debug('Auto-renewal cron is already running, skipping this tick');
      return;
    }

    this.isRunning = true;

    const lockKey = 987654321; // project-unique lock key for renewal job
    let lockAcquired = false;

    try {
      this.logger.log('🚀 Starting auto-renewal process...');

      // Try to acquire advisory lock to avoid multiple instances running the renewal simultaneously
      let gotLock: Array<{ pg_try_advisory_lock: boolean }> | null = null;
      try {
        gotLock = await this._prismaService.$queryRaw`
          SELECT pg_try_advisory_lock(${lockKey}::bigint) as pg_try_advisory_lock;
        `;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          'Advisory lock acquisition failed (DB error) - skipping renewal run: ' + msg,
        );
        return;
      }

      if (!gotLock || gotLock[0]?.pg_try_advisory_lock !== true) {
        this.logger.debug('Another instance holds the advisory lock; skipping renewal run');
        return;
      }

      lockAcquired = true;

      // Tìm subscriptions cần gia hạn:
      // 1. Subscriptions hết hạn trong 1 ngày tới (regular renewal)
      // 2. Subscriptions có retry pending (next_renew_attempt_at trong quá khứ)
      const now = dayjs().tz('Asia/Ho_Chi_Minh');
      const tomorrow = now.add(1, 'day').startOf('day');
      const dayAfter = tomorrow.add(1, 'day').endOf('day');

      const subscriptionsToRenew = await this._subscriptionService.findSubscriptionsToRenew(
        tomorrow.toDate(),
        dayAfter.toDate(),
      );

      const subscriptionsWithRetries = await this._prismaService.$queryRaw<
        Array<{
          subscription_id: string;
          user_id: string;
          plan_code: string;
          plan_id: string | null;
          status: string;
          current_period_end: Date | null;
          auto_renew: boolean;
          renewal_attempt_count: number;
          next_renew_attempt_at: Date | null;
          users: {
            user_id: string;
            email: string | null;
            default_payment_method_id: string | null;
          };
          plans: any;
        }>
      >`
        SELECT
          s.*,
          ROW_TO_JSON(u.*) as users,
          ROW_TO_JSON(p.*) as plans
        FROM subscriptions s
        LEFT JOIN users u ON s.user_id = u.user_id
        LEFT JOIN plans p ON s.plan_id = p.id
        WHERE s.auto_renew = true
          AND s.status IN ('active', 'past_due')
          AND s.next_renew_attempt_at IS NOT NULL
          AND s.next_renew_attempt_at <= ${now.toDate()}
      `;

      // Combine and deduplicate subscriptions
      const allSubscriptionsToProcess = [
        ...subscriptionsToRenew,
        ...subscriptionsWithRetries.filter(
          (retrySub) =>
            !subscriptionsToRenew.some(
              (renewSub) => renewSub.subscription_id === retrySub.subscription_id,
            ),
        ),
      ];

      this.logger.log(
        `📋 Found ${subscriptionsToRenew.length} subscriptions to renew, ${subscriptionsWithRetries.length} with retry attempts, ${allSubscriptionsToProcess.length} total to process`,
      );

      let successCount = 0;
      let failureCount = 0;

      for (const subscription of allSubscriptionsToProcess) {
        try {
          this.logger.debug(
            '🔄 Processing renewal for subscription ' + subscription.subscription_id,
          );

          // Skip if subscription explicitly disabled auto_renew (defensive)
          if (!subscription.auto_renew) {
            this.logger.debug(
              `Subscription ${subscription.subscription_id} has auto_renew=false, skipping`,
            );
            continue;
          }

          // Proceed regardless of whether a default payment method exists.
          // We will create a payment link (VNPay) and notify the user to complete payment on the frontend.

          // Per-subscription advisory lock to avoid concurrent processing of same subscription
          let subLockAcquired = false;
          try {
            const lockResult: Array<{ pg_try_advisory_lock: boolean }> = await this._prismaService
              .$queryRaw`
              SELECT pg_try_advisory_lock(hashtext(${subscription.subscription_id})::bigint) as pg_try_advisory_lock;
            `;
            if (!lockResult || lockResult[0]?.pg_try_advisory_lock !== true) {
              this.logger.debug(
                `Could not acquire per-subscription lock for ${subscription.subscription_id}; skipping`,
              );
              continue;
            }

            subLockAcquired = true;

            // Idempotency check: re-fetch current_period_end to ensure it wasn't already extended
            try {
              const fresh = await this._prismaService.subscriptions.findUnique({
                where: { subscription_id: subscription.subscription_id },
                select: { current_period_end: true },
              });

              if (
                fresh?.current_period_end &&
                subscription.current_period_end &&
                new Date(fresh.current_period_end) > new Date(subscription.current_period_end)
              ) {
                this.logger.log(
                  `Subscription ${subscription.subscription_id} was already extended by another process; skipping`,
                );
                continue;
              }
            } catch (err) {
              this.logger.warn(
                `Failed idempotency check for ${subscription.subscription_id}: ${String(err)}`,
              );
              // continue processing (conservative)
            }

            // Tạo payment tự động / invoice
            const paymentResult = await this._paymentService.createAutoRenewalPayment(subscription);

            if (paymentResult.success) {
              // If a paymentUrl was returned, notify the user to pay via frontend
              if ((paymentResult as any).paymentUrl) {
                const userEmail = (subscription.users as any)?.email;
                const planName = subscription.plans?.name || 'your plan';
                const expiryDate = subscription.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString('en-GB')
                  : 'soon';

                try {
                  if (userEmail) {
                    const paymentUrl = (paymentResult as any).paymentUrl as string;
                    const html = `
                      <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
                        <h2 style="color:#ff6b35;">Renew your subscription</h2>
                        <p>Your <strong>${planName}</strong> subscription expired on <strong>${expiryDate}</strong>.</p>
                        <p>Click the button below to complete payment and renew your subscription:</p>
                        <a href="${paymentUrl}" style="background-color:#ff6b35;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;margin:16px 0;">Pay & Renew</a>
                        <p style="color:#666;font-size:14px;">If the button doesn't work, open this link in your browser: ${paymentUrl}</p>
                      </div>
                    `;

                    await this._notificationService.sendEmail({
                      to: userEmail,
                      subject: 'Renew your Healthcare VisionAI subscription',
                      html,
                      text: `Please renew your subscription: ${paymentUrl}`,
                    });

                    this.logger.log(
                      `ℹ️ Sent payment link to ${userEmail} for subscription ${subscription.subscription_id}`,
                    );
                  } else {
                    this.logger.debug(
                      `No user email available for subscription ${subscription.subscription_id}; skipping payment link notification`,
                    );
                  }
                } catch (notifyErr) {
                  this.logger.warn(
                    'Failed to send payment link notification for subscription ' +
                      subscription.subscription_id +
                      ': ' +
                      ((notifyErr as any)?.message || notifyErr),
                  );
                }

                successCount++;
              } else {
                this.logger.log(
                  `✅ Successfully renewed subscription ${subscription.subscription_id}`,
                );
                successCount++;
              }
            } else {
              this.logger.error(
                '❌ Failed to create payment for subscription ' +
                  subscription.subscription_id +
                  ': ' +
                  (paymentResult.error || 'unknown'),
              );
              failureCount++;

              // Notify user about failed auto-renewal (if user email available)
              try {
                const userEmail = (subscription.users as any)?.email;
                const planName = subscription.plans?.name || 'your plan';
                const expiryDate = subscription.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString('en-GB')
                  : 'soon';

                if (userEmail) {
                  await this._notificationService.sendSubscriptionExpiryReminder(
                    userEmail,
                    planName,
                    expiryDate,
                  );
                  this.logger.log(
                    'ℹ️ Sent expiry/failure notification to ' +
                      userEmail +
                      ' for subscription ' +
                      subscription.subscription_id,
                  );
                } else {
                  this.logger.debug(
                    'No user email available for subscription ' +
                      subscription.subscription_id +
                      '; skipping notification',
                  );
                }
              } catch (notifyErr) {
                this.logger.warn(
                  'Failed to send notification for subscription ' +
                    subscription.subscription_id +
                    ': ' +
                    ((notifyErr as any)?.message || notifyErr),
                );
              }
            }
          } finally {
            if (subLockAcquired) {
              try {
                await this._prismaService.$queryRaw`
                  SELECT pg_advisory_unlock(hashtext(${subscription.subscription_id})::bigint) as unlocked;
                `;
              } catch (unlockErr) {
                this.logger.warn(
                  'Failed to release per-subscription advisory lock for ' +
                    subscription.subscription_id +
                    ': ' +
                    ((unlockErr as any)?.message || unlockErr),
                );
              }
            }
          }
        } catch (error) {
          this.logger.error(
            '💥 Error processing subscription ' + subscription.subscription_id + ':',
            error,
          );
          failureCount++;
        }
      }

      this.logger.log(
        '🎉 Auto-renewal completed: ' + successCount + ' success, ' + failureCount + ' failures',
      );
    } catch (error) {
      this.logger.error('💥 Auto-renewal process failed:', error);
    } finally {
      if (lockAcquired) {
        try {
          await this._prismaService.$queryRaw`
            SELECT pg_advisory_unlock(${lockKey}::bigint) as unlocked;
          `;
        } catch (unlockErr) {
          this.logger.warn(
            'Failed to release advisory lock for renewal: ' +
              ((unlockErr as any)?.message || unlockErr),
          );
        }
      }

      this.isRunning = false;
    }
  }
}
