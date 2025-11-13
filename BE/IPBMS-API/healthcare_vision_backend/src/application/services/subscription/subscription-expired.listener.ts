import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { SharedPermissionsService } from '../shared/shared-permissions.service';
import { QuotaService } from '../admin/quota.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface SubscriptionExpiredPayload {
  subscriptionId: string;
  userId: string;
  previousPlan?: string | null;
  targetPlan?: string | null;
  scheduledDowngradeAt?: string | null;
}

@Injectable()
export class SubscriptionExpiredListener {
  private readonly logger = new Logger(SubscriptionExpiredListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sharedPermissionsService: SharedPermissionsService,
    private readonly quotaService: QuotaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('subscription.expired')
  async handleExpired(payload: SubscriptionExpiredPayload) {
    this.logger.debug(
      `[SubscriptionExpiredListener] Handling subscription.expired for ${payload.subscriptionId}`,
    );

    await this.enforceBasicAccess(payload.userId);
    await this.revokeCaregiverPermissions(payload.userId);
    await this.emitFrontendNotification({
      userId: payload.userId,
      status: 'expired',
      message:
        'Gói dịch vụ của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng đầy đủ quyền lợi.',
    });
  }

  @OnEvent('subscription.expired.followup')
  async handleExpiredFollowup(payload: { subscriptionId: string; userId: string }) {
    this.logger.debug(
      `[SubscriptionExpiredListener] Handling followup for ${payload.subscriptionId}`,
    );

    // Re-apply enforcement in case new caregivers were added after first expiration.
    await this.enforceBasicAccess(payload.userId);
    await this.revokeCaregiverPermissions(payload.userId);
    await this.emitFrontendNotification({
      userId: payload.userId,
      status: 'expired',
      message:
        'Tài khoản vẫn đang ở gói Basic sau khi hết hạn. Hãy gia hạn gói dịch vụ để khôi phục đầy đủ quyền lợi.',
    });
  }

  private async enforceBasicAccess(userId: string) {
    try {
      await this.quotaService.ensureFreeSubscription(userId);
    } catch (err) {
      this.logger.warn(
        `[SubscriptionExpiredListener] ensureFreeSubscription failed for ${userId}: ${String(
          err instanceof Error ? err.message : err,
        )}`,
      );
    }
  }

  private async emitFrontendNotification(payload: {
    userId: string;
    status: 'expired' | 'downgraded';
    message: string;
  }) {
    try {
      await this.eventEmitter.emitAsync('user.notification', [
        {
          userId: payload.userId,
          type: 'subscription_status',
          status: payload.status,
          message: payload.message,
        },
      ]);
    } catch (err) {
      this.logger.warn(
        `[SubscriptionExpiredListener] Failed to emit user.notification for ${payload.userId}: ${String(
          err instanceof Error ? err.message : err,
        )}`,
      );
    }
  }

  private async revokeCaregiverPermissions(userId: string) {
    const invitations = await this.prisma.caregiver_invitations.findMany({
      where: { customer_id: userId, is_active: true },
      select: { caregiver_id: true },
    });

    if (!invitations.length) return;

    for (const inv of invitations) {
      try {
        await this.sharedPermissionsService.update(userId, inv.caregiver_id, {
          stream_view: false,
          stream_edit: false,
          alert_read: false,
          alert_ack: false,
          profile_view: false,
        });
      } catch (err) {
        this.logger.warn(
          `[SubscriptionExpiredListener] Failed to revoke shared permissions for customer=${userId}, caregiver=${inv.caregiver_id}: ${String(
            err instanceof Error ? err.message : err,
          )}`,
        );
      }
    }
  }
}
