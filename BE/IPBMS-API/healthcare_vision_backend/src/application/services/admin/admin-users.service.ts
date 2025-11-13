import { Injectable } from '@nestjs/common';
import { Quota } from '../../../infrastructure/repositories/admin/quota.repository';
import { AdminPlansService } from './admin-plans.service';
import { QuotaService } from './quota.service';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly _quotaService: QuotaService,
    private readonly _adminPlansService: AdminPlansService,
  ) {}

  // Quota: always use QuotaService
  async getQuota(userId: string) {
    return this._quotaService.getEffectiveQuota(userId);
  }

  // Update quota (example: update extra_camera_quota for user)
  async updateQuota(userId: string, quota: number) {
    return this._quotaService.updateUserQuota(userId, quota);
  }

  // Delete quota (example: reset extra_camera_quota for user)
  async deleteQuota(userId: string) {
    return this._quotaService.updateUserQuota(userId, 0);
  }

  // Get plan for user (returns current plan info)
  async getPlan(userId: string) {
    // Use AdminPlansService to get plan data
    const quota = await this._quotaService.getEffectiveQuota(userId);
    // For now, return the quota as plan data
    // In real implementation, should get actual plan from subscription
    return {
      code: 'UNKNOWN',
      name: 'Current Plan',
      ...quota,
    };
  }

  // CRUD for plans
  async createPlan(plan: Partial<Quota> & { code: string; name: string; price: number }) {
    return this._quotaService.createPlan(plan);
  }

  async getPlanByCode(code: string) {
    return this._quotaService.getPlanByCode(code);
  }

  async getAllPlans() {
    return this._quotaService.getAllPlans();
  }

  async updatePlan(code: string, updates: Partial<Quota>) {
    return this._quotaService.updatePlan(code, updates);
  }

  async deletePlan(code: string) {
    return this._quotaService.deletePlan(code);
  }
}
