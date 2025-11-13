import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

export type Quota = {
  camera_quota: number;
  retention_days: number;
  caregiver_seats: number;
  sites: number;
  max_storage_gb: number;
  created_at: Date;
  updated_at: Date;
};

export type QuotaUsage = {
  camera_count: number;
  caregiver_count: number;
  room_count: number;
  storage_used_gb: number;
};

@Injectable()
export class QuotaRepository extends BasePrismaRepository {
  private readonly _logger = new Logger(QuotaRepository.name);
  // Active subscription statuses for quota calculations
  private readonly ACTIVE_STATUSES = ['trialing', 'active'] as const;

  constructor(
    protected prismaService: PrismaService,
    protected unitOfWork: UnitOfWork,
  ) {
    super(prismaService, unitOfWork);
  }

  /**
   * Get user's current quota based on their subscription plan
   */
  async getUserQuota(userId: string): Promise<Quota | null> {
    const subscription = await this.prisma.subscriptions.findFirst({
      where: {
        user_id: userId,
        status: { in: ['trialing', 'active'] },
      },
      include: {
        plans: true,
      },
      orderBy: {
        current_period_start: 'desc',
      },
    });

    if (!subscription) {
      return null;
    }

    const plan = subscription.plans;
    if (!plan) {
      throw new Error('No plan data found in subscription');
    }
    return {
      camera_quota: plan.camera_quota + subscription.extra_camera_quota,
      retention_days: plan.retention_days,
      caregiver_seats: plan.caregiver_seats + subscription.extra_caregiver_seats,
      sites: plan.sites + subscription.extra_sites,
      max_storage_gb: parseFloat(plan.storage_size || '0') + subscription.extra_storage_gb,
      created_at: plan.created_at || new Date(),
      updated_at: new Date(), // Plans don't have updated_at, use current time
    };
  }

  /**
   * Get user's latest subscription by plan code
   */
  async getLatestSubscriptionByPlanCode(userId: string, planCode: string): Promise<any> {
    return this.prisma.subscriptions.findFirst({
      where: {
        user_id: userId,
        plan_code: planCode,
      },
      orderBy: {
        started_at: 'desc',
      },
    });
  }

  /**
   * Get user's subscription status
   */
  async getUserSubscriptionStatus(userId: string): Promise<string | null> {
    const subscription = await this.prisma.subscriptions.findFirst({
      where: {
        user_id: userId,
        status: { in: ['trialing', 'active'] },
      },
      orderBy: {
        current_period_start: 'desc',
      },
    });

    return subscription?.status || null;
  }

  /**
   * Calculate storage used by user (in GB)
   */
  async getStorageUsed(userId: string): Promise<number> {
    try {
      // Calculate total file size from snapshot_files for the user
      const result = await this.prisma.$queryRaw<[{ storage_gb: number }]>`
        SELECT
          COALESCE(SUM(si.file_size), 0) / (1024.0 * 1024.0 * 1024.0) as storage_gb
        FROM snapshot_images si
        JOIN snapshots s ON si.snapshot_id = s.snapshot_id
        WHERE s.user_id = ${userId}
      `;

      return Number(result[0]?.storage_gb) || 0;
    } catch (error) {
      this._logger.error('[QuotaRepository] Error calculating storage: ' + (error as any));
      return 0; // Return 0 if there's any error
    }
  }

  /**
   * Get user's quota usage
   */
  async getUserQuotaUsage(userId: string): Promise<QuotaUsage> {
    // Get camera count (active cameras only)
    const cameraCount = await this.prisma.cameras.count({
      where: {
        user_id: userId,
        status: 'active',
      },
    });

    // Get caregiver count (active assignments only)
    const caregiverCount = await this.prisma.caregiver_invitations.count({
      where: {
        customer_id: userId,
        is_active: true,
      },
    });

    // Get storage used
    const storageUsed = await this.getStorageUsed(userId);

    return {
      camera_count: cameraCount,
      caregiver_count: caregiverCount,
      room_count: 0, // Rooms model doesn't exist, so set to 0
      storage_used_gb: storageUsed,
    };
  }

  /**
   * Check if user can add more cameras
   */
  async canAddCamera(userId: string): Promise<{ allowed: boolean; quota: number; used: number }> {
    const quota = await this.getUserQuota(userId);
    if (!quota) {
      return { allowed: false, quota: 0, used: 0 };
    }

    const usage = await this.getUserQuotaUsage(userId);

    return {
      allowed: usage.camera_count < quota.camera_quota,
      quota: quota.camera_quota,
      used: usage.camera_count,
    };
  }

  /**
   * Check if user can add more caregivers
   */
  async canAddCaregiver(
    userId: string,
  ): Promise<{ allowed: boolean; quota: number; used: number }> {
    const quota = await this.getUserQuota(userId);
    if (!quota) {
      return { allowed: false, quota: 0, used: 0 };
    }

    const usage = await this.getUserQuotaUsage(userId);

    return {
      allowed: usage.caregiver_count < quota.caregiver_seats,
      quota: quota.caregiver_seats,
      used: usage.caregiver_count,
    };
  }

  /**
   * Check if user has exceeded storage quota
   */
  async isStorageExceeded(
    userId: string,
  ): Promise<{ exceeded: boolean; quota: number; used: number }> {
    const quota = await this.getUserQuota(userId);
    if (!quota) {
      return { exceeded: true, quota: 0, used: 0 };
    }

    const usage = await this.getUserQuotaUsage(userId);

    return {
      exceeded: usage.storage_used_gb > quota.max_storage_gb,
      quota: quota.max_storage_gb,
      used: usage.storage_used_gb,
    };
  }

  /**
   * Get comprehensive quota status for user
   */
  async getQuotaStatus(userId: string): Promise<{
    quota: Quota | null;
    usage: QuotaUsage;
    cameras: { allowed: boolean; quota: number; used: number };
    caregivers: { allowed: boolean; quota: number; used: number };
    storage: { exceeded: boolean; quota: number; used: number };
  }> {
    const quota = await this.getUserQuota(userId);
    const usage = await this.getUserQuotaUsage(userId);
    const cameras = await this.canAddCamera(userId);
    const caregivers = await this.canAddCaregiver(userId);
    const storage = await this.isStorageExceeded(userId);

    return {
      quota,
      usage,
      cameras,
      caregivers,
      storage,
    };
  }

  /**
   * Execute operation in transaction - public wrapper for protected method
   */
  async executeTransaction<T>(operation: (_tx: any) => Promise<T>): Promise<T> {
    return this._unitOfWork.executeInTransaction(operation);
  }
}
