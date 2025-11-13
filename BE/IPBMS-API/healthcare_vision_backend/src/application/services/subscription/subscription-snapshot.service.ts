import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { toMinor } from '../../../shared/utils/money.util';

@Injectable()
export class SubscriptionSnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Build a normalized snapshot object for a plan row
   */
  buildSnapshotFromPlan(plan: any, currency: string, period: string) {
    const unitMajor = plan?.price ?? 0; // plan.price is stored as major VND
    const unitMinor = toMinor(unitMajor); // convert to minor units (standardized ×100)

    return {
      code: plan.code,
      version: plan.version,
      features: {
        camera_quota: plan.camera_quota,
        retention_days: plan.retention_days,
      },
      currency,
      billing_period: period,
      // unit_amount_minor should be minor units (string for JSON safety)
      unit_amount_minor: String(unitMinor),
      // keep major amount as well for backward compatibility (optional)
      unit_amount: Number(unitMajor),
    };
  }

  async persistSnapshotOnCreate(subscriptionId: string, snapshot: any) {
    return this.prisma.subscriptions.update({
      where: { subscription_id: subscriptionId },
      data: {
        plan_snapshot: snapshot,
        unit_amount_minor: snapshot?.unit_amount_minor ? BigInt(snapshot.unit_amount_minor) : 0n,
      },
    });
  }
}
