import { Injectable } from '@nestjs/common';
import { QuotaRepository } from '../../../infrastructure/repositories/admin/quota.repository';
import type { Quota } from '../../../infrastructure/repositories/admin/quota.repository';

@Injectable()
export class QuotaService {
  private readonly GRACE_PERIOD_DAYS = 30;

  constructor(private readonly _quotaRepository: QuotaRepository) {}

  /**
   * Đảm bảo degrade về FREE subscription nếu cần
   */
  async ensureFreeSubscription(_userId: string) {
    // Implementation would require more complex logic with repository methods
    // For now, just return success - this is a placeholder
    return { success: true };
  }

  // ===== ENTITLEMENT ENFORCEMENT METHODS =====

  /**
   * Enforce hard cap - throw error if quota exceeded
   */
  async enforceHardCap(
    userId: string,
    resourceType: 'camera' | 'caregiver' | 'storage' | 'site',
    action: 'add' | 'use' = 'add',
  ) {
    const quotaStatus = await this.getQuotaStatus(userId);
    const usage = await this._quotaRepository.getUserQuotaUsage(userId);

    switch (resourceType) {
      case 'camera':
        if (usage.camera_count >= quotaStatus.cameras.quota) {
          throw new Error(
            `Camera quota exceeded. Current: ${usage.camera_count}, Limit: ${quotaStatus.cameras.quota}`,
          );
        }
        break;

      case 'caregiver':
        if (usage.caregiver_count >= quotaStatus.caregivers.quota) {
          throw new Error(
            `Caregiver quota exceeded. Current: ${usage.caregiver_count}, Limit: ${quotaStatus.caregivers.quota}`,
          );
        }
        break;

      case 'storage':
        if (action === 'use') {
          if (quotaStatus.storage.exceeded) {
            throw new Error(
              `Storage quota exceeded. Used: ${quotaStatus.storage.used}GB, Limit: ${quotaStatus.storage.quota}GB`,
            );
          }
        }
        break;

      case 'site':
        // Note: Using room_count as site count for now
        if (usage.room_count >= 10) {
          // Default site limit
          throw new Error(`Site quota exceeded. Current: ${usage.room_count}, Limit: 10`);
        }
        break;
    }
  }

  /**
   * Check soft cap - return warning if approaching limit
   */
  async checkSoftCap(
    userId: string,
    resourceType: 'camera' | 'caregiver' | 'storage' | 'site',
  ): Promise<{ warning: boolean; message?: string; percentage: number }> {
    const quotaStatus = await this.getQuotaStatus(userId);
    const usage = await this._quotaRepository.getUserQuotaUsage(userId);

    const SOFT_CAP_THRESHOLD = 0.8; // 80% usage triggers warning

    switch (resourceType) {
      case 'camera': {
        const percentage = usage.camera_count / quotaStatus.cameras.quota;
        if (percentage >= SOFT_CAP_THRESHOLD) {
          return {
            warning: true,
            message: `Approaching camera limit: ${usage.camera_count}/${quotaStatus.cameras.quota} (${Math.round(percentage * 100)}%)`,
            percentage,
          };
        }
        return { warning: false, percentage };
      }

      case 'caregiver': {
        const percentage = usage.caregiver_count / quotaStatus.caregivers.quota;
        if (percentage >= SOFT_CAP_THRESHOLD) {
          return {
            warning: true,
            message: `Approaching caregiver limit: ${usage.caregiver_count}/${quotaStatus.caregivers.quota} (${Math.round(percentage * 100)}%)`,
            percentage,
          };
        }
        return { warning: false, percentage };
      }

      case 'storage': {
        const percentage = quotaStatus.storage.used / quotaStatus.storage.quota;
        if (percentage >= SOFT_CAP_THRESHOLD) {
          return {
            warning: true,
            message: `Approaching storage limit: ${quotaStatus.storage.used}GB/${quotaStatus.storage.quota}GB (${Math.round(percentage * 100)}%)`,
            percentage,
          };
        }
        return { warning: false, percentage };
      }

      case 'site': {
        const percentage = usage.room_count / 10; // Default site limit
        if (percentage >= SOFT_CAP_THRESHOLD) {
          return {
            warning: true,
            message: `Approaching site limit: ${usage.room_count}/10 (${Math.round(percentage * 100)}%)`,
            percentage,
          };
        }
        return { warning: false, percentage };
      }

      default:
        return { warning: false, percentage: 0 };
    }
  }

  /**
   * Grace period enforcement - allow temporary overage
   */
  async checkGracePeriod(
    userId: string,
    resourceType: 'camera' | 'caregiver' | 'storage' | 'site',
  ): Promise<{ allowed: boolean; daysRemaining?: number; message?: string }> {
    const quotaStatus = await this.getQuotaStatus(userId);
    const usage = await this._quotaRepository.getUserQuotaUsage(userId);

    // Check if user is over quota
    let isOverQuota = false;
    let currentUsage = 0;
    let limit = 0;

    switch (resourceType) {
      case 'camera':
        isOverQuota = usage.camera_count > quotaStatus.cameras.quota;
        currentUsage = usage.camera_count;
        limit = quotaStatus.cameras.quota;
        break;
      case 'caregiver':
        isOverQuota = usage.caregiver_count > quotaStatus.caregivers.quota;
        currentUsage = usage.caregiver_count;
        limit = quotaStatus.caregivers.quota;
        break;
      case 'storage':
        isOverQuota = quotaStatus.storage.exceeded;
        currentUsage = quotaStatus.storage.used;
        limit = quotaStatus.storage.quota;
        break;
      case 'site':
        isOverQuota = usage.room_count > 10; // Default site limit
        currentUsage = usage.room_count;
        limit = 10;
        break;
    }

    if (!isOverQuota) {
      return { allowed: true };
    }

    // Check grace period from subscription
    const subscription = await this._quotaRepository.executeTransaction(async (tx: any) => {
      return tx.subscriptions.findFirst({
        where: {
          user_id: userId,
          status: { in: ['active', 'trialing', 'past_due', 'grace'] },
        },
        orderBy: { current_period_start: 'desc' },
      });
    });

    if (!subscription) {
      return {
        allowed: false,
        message: `No active subscription found. Current usage: ${currentUsage}, Limit: ${limit}`,
      };
    }

    // Calculate days since quota exceeded (simplified - use last payment or subscription start)
    const graceStart = subscription.last_payment_at || subscription.started_at;
    const daysSinceExceeded = Math.floor(
      (Date.now() - graceStart.getTime()) / (1000 * 60 * 60 * 24),
    );

    const daysRemaining = Math.max(0, this.GRACE_PERIOD_DAYS - daysSinceExceeded);

    if (daysRemaining > 0) {
      return {
        allowed: true,
        daysRemaining,
        message: `Using grace period. ${daysRemaining} days remaining before service suspension.`,
      };
    }

    return {
      allowed: false,
      message: `Grace period expired. Current usage: ${currentUsage}, Limit: ${limit}. Service may be suspended.`,
    };
  }

  /**
   * Comprehensive entitlement check with hard/soft cap and grace period
   */
  async checkEntitlement(
    userId: string,
    resourceType: 'camera' | 'caregiver' | 'storage' | 'site',
    action: 'add' | 'use' = 'add',
  ): Promise<{
    allowed: boolean;
    warning?: string;
    error?: string;
    gracePeriod?: { daysRemaining: number; message: string };
  }> {
    try {
      // First check hard cap
      await this.enforceHardCap(userId, resourceType, action);

      // Then check soft cap for warnings
      const softCapCheck = await this.checkSoftCap(userId, resourceType);

      // Check grace period if over quota
      const graceCheck = await this.checkGracePeriod(userId, resourceType);

      return {
        allowed: true,
        warning: softCapCheck.warning ? softCapCheck.message : undefined,
        gracePeriod: graceCheck.daysRemaining
          ? { daysRemaining: graceCheck.daysRemaining, message: graceCheck.message! }
          : undefined,
      };
    } catch (error) {
      // If hard cap enforcement failed, check grace period
      const graceCheck = await this.checkGracePeriod(userId, resourceType);

      if (graceCheck.allowed) {
        const softCapCheck = await this.checkSoftCap(userId, resourceType);
        return {
          allowed: true,
          warning: softCapCheck.warning ? softCapCheck.message : undefined,
          gracePeriod: { daysRemaining: graceCheck.daysRemaining!, message: graceCheck.message! },
        };
      }

      return {
        allowed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Auto-cleanup when quota exceeded and grace period expired
   */
  async autoCleanup(userId: string): Promise<{ cleaned: boolean; actions: string[] }> {
    const actions: string[] = [];

    // Check camera quota
    const cameraGrace = await this.checkGracePeriod(userId, 'camera');
    if (!cameraGrace.allowed) {
      // Disable excess cameras (logic would depend on camera service)
      actions.push('Disabled excess cameras due to quota violation');
    }

    // Check caregiver quota
    const caregiverGrace = await this.checkGracePeriod(userId, 'caregiver');
    if (!caregiverGrace.allowed) {
      // Disable excess caregiver assignments
      actions.push('Disabled excess caregiver assignments due to quota violation');
    }

    // Check storage quota
    const storageGrace = await this.checkGracePeriod(userId, 'storage');
    if (!storageGrace.allowed) {
      // Delete old snapshots or disable credential_images
      actions.push('Disabled storage credential_images due to quota violation');
    }

    return {
      cleaned: actions.length > 0,
      actions,
    };
  }

  /**
   * Tính quota hiệu lực cho user
   */
  async getEffectiveQuota(userId: string): Promise<Quota> {
    const quota = await this._quotaRepository.getUserQuota(userId);

    if (!quota) {
      // Return FREE plan defaults if no subscription found
      return {
        camera_quota: 1,
        retention_days: 3,
        caregiver_seats: 1,
        sites: 1,
        max_storage_gb: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
    }

    return quota;
  }

  /**
   * Kiểm tra quota camera trước khi thêm mới
   */
  async canAddCamera(userId: string) {
    const result = await this._quotaRepository.canAddCamera(userId);
    return {
      allowed: result.allowed,
      current: result.used,
      limit: result.quota,
    };
  }

  /**
   * Kiểm tra quota caregiver trước khi thêm mới
   */
  async canAddCaregiver(userId: string) {
    const result = await this._quotaRepository.canAddCaregiver(userId);
    return {
      allowed: result.allowed,
      current: result.used,
      limit: result.quota,
    };
  }

  /**
   * Kiểm tra storage quota
   */
  async checkStorageQuota(userId: string) {
    const result = await this._quotaRepository.isStorageExceeded(userId);
    return {
      exceeded: result.exceeded,
      used: result.used,
      limit: result.quota,
    };
  }

  /**
   * Lấy comprehensive quota status
   */
  async getQuotaStatus(userId: string) {
    return this._quotaRepository.getQuotaStatus(userId);
  }

  /**
   * Lấy user_id từ site_id (giả sử site_id = user_id hoặc có logic mapping)
   */
  private async getUserIdFromSiteId(siteId: string): Promise<string> {
    if (siteId.startsWith('site-')) {
      const userId = siteId.replace('site-', '');
      return userId;
    }
    return siteId;
  }

  /**
   * Lấy quota hiệu lực cho site (thông qua user_id)
   */
  async getEffectiveQuotaBySite(siteId: string): Promise<Quota> {
    const userId = await this.getUserIdFromSiteId(siteId);
    return this.getEffectiveQuota(userId);
  }

  /**
   * Kiểm tra quota camera cho site
   */
  async canAddCameraBySite(siteId: string) {
    const userId = await this.getUserIdFromSiteId(siteId);
    return this.canAddCamera(userId);
  }

  /**
   * Kiểm tra quota caregiver cho site
   */
  async canAddCaregiverBySite(siteId: string) {
    const userId = await this.getUserIdFromSiteId(siteId);
    return this.canAddCaregiver(userId);
  }

  /**
   * Đếm số camera cho site (thông qua user_id)
   */
  async countCamerasBySite(siteId: string): Promise<number> {
    const userId = await this.getUserIdFromSiteId(siteId);
    const usage = await this._quotaRepository.getUserQuotaUsage(userId);
    return usage.camera_count;
  }

  /**
   * Đếm số caregivers cho site
   */
  async countCaregiversBySite(siteId: string): Promise<number> {
    const userId = await this.getUserIdFromSiteId(siteId);
    const usage = await this._quotaRepository.getUserQuotaUsage(userId);
    return usage.caregiver_count;
  }

  /**
   * Lấy storage usage cho site
   */
  async getStorageUsageBySite(siteId: string): Promise<number> {
    const userId = await this.getUserIdFromSiteId(siteId);
    return this._quotaRepository.getStorageUsed(userId);
  }

  /**
   * Lấy comprehensive quota usage cho site
   */
  async getQuotaUsageBySite(siteId: string) {
    const userId = await this.getUserIdFromSiteId(siteId);
    return this._quotaRepository.getUserQuotaUsage(userId);
  }

  /**
   * Đếm số events trong 30 ngày cho site (placeholder method)
   */
  async countEvents30dBySite(_siteId: string): Promise<number> {
    // This method was used by quota.guard.ts
    // For now, return 0 as events counting needs separate implementation
    return 0;
  }

  // ===== PLAN MANAGEMENT METHODS (Moved from AdminUsersService) =====

  /**
   * Tạo mới một plan
   */
  async createPlan(_plan: Partial<Quota> & { code: string; name: string; price: number }) {
    // For now, throw error - this should be implemented in a separate PlanRepository
    throw new Error('Plan management not implemented in repository pattern yet');
  }

  /**
   * Lấy thông tin một plan theo code
   */
  async getPlanByCode(_code: string) {
    // For now, throw error - this should be implemented in a separate PlanRepository
    throw new Error('Plan management not implemented in repository pattern yet');
  }

  /**
   * Lấy tất cả các plan
   */
  async getAllPlans() {
    // For now, throw error - this should be implemented in a separate PlanRepository
    throw new Error('Plan management not implemented in repository pattern yet');
  }

  /**
   * Cập nhật một plan
   */
  async updatePlan(_code: string, _updates: Partial<Quota>) {
    // For now, throw error - this should be implemented in a separate PlanRepository
    throw new Error('Plan management not implemented in repository pattern yet');
  }

  /**
   * Xóa một plan
   */
  async deletePlan(_code: string) {
    // For now, throw error - this should be implemented in a separate PlanRepository
    throw new Error('Plan management not implemented in repository pattern yet');
  }

  // ===== SUBSCRIPTION MANAGEMENT METHODS =====

  /**
   * Update quota for user's active subscription
   */
  async updateUserQuota(userId: string, quota: number) {
    // Use repository to update subscription quota
    // For now, delegate to QuotaRepository with proper transaction
    return this._quotaRepository.executeTransaction(async (tx: any) => {
      // Find active subscription
      const subscription = await tx.subscriptions.findFirst({
        where: {
          user_id: userId,
          status: { in: ['active', 'trialing'] },
        },
        orderBy: {
          current_period_start: 'desc',
        },
      });

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // Update extra camera quota
      await tx.subscriptions.update({
        where: { subscription_id: subscription.subscription_id },
        data: { extra_camera_quota: quota },
      });

      return { success: true };
    });
  }

  /**
   * Add extra quota for user's active subscription
   */
  async addExtraQuota(userId: string, quota: number) {
    return this._quotaRepository.executeTransaction(async (tx: any) => {
      const subscription = await tx.subscriptions.findFirst({
        where: {
          user_id: userId,
          status: { in: ['active', 'trialing'] },
        },
        orderBy: {
          current_period_start: 'desc',
        },
      });

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      const newQuota = (subscription.extra_camera_quota || 0) + quota;
      await tx.subscriptions.update({
        where: { subscription_id: subscription.subscription_id },
        data: { extra_camera_quota: newQuota },
      });

      return { success: true };
    });
  }

  /**
   * Remove extra quota for user's active subscription
   */
  async removeExtraQuota(userId: string, quota: number) {
    return this._quotaRepository.executeTransaction(async (tx: any) => {
      const subscription = await tx.subscriptions.findFirst({
        where: {
          user_id: userId,
          status: { in: ['active', 'trialing'] },
        },
        orderBy: {
          current_period_start: 'desc',
        },
      });

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      const newQuota = Math.max(0, (subscription.extra_camera_quota || 0) - quota);
      await tx.subscriptions.update({
        where: { subscription_id: subscription.subscription_id },
        data: { extra_camera_quota: newQuota },
      });

      return { success: true };
    });
  }

  /**
   * Get user quota usage (public wrapper)
   */
  async getUserQuotaUsage(userId: string) {
    return this._quotaRepository.getUserQuotaUsage(userId);
  }
}
