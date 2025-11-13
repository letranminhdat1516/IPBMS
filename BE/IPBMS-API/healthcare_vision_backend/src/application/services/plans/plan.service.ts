import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve unit amount (minor units) from a plan row.
   * Resolve unit amount for a plan. Uses the scalar `price` field as the canonical value.
   */
  async resolveUnitAmount(planId: string): Promise<bigint> {
    const plan = await this.prisma.plans.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plan not found');
    // We now use scalar `price` (monthly in minor units) as canonical price.
    if (plan.price == null) throw new Error('No price defined for plan');
    return BigInt(plan.price as any);
  }
}
