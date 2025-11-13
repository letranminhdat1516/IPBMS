import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CacheService } from '../system';
import { AdminPlansRepository } from '../../../infrastructure/repositories/admin/admin-plans.repository';

/**
 * Service quản lý các gói dịch vụ (plans) và phiên bản của chúng
 * Xử lý CRUD operations cho plans và plan_versions
 * Bao gồm caching để tối ưu hiệu suất
 */
@Injectable()
export class AdminPlansService {
  private readonly _logger = new Logger(AdminPlansService.name);
  /**
   * Constructor - Khởi tạo service với cache service và repository
   * @param _cacheService - Service cache để lưu trữ tạm thời dữ liệu
   * @param adminPlansRepo - Repository xử lý các operations với plans
   */
  constructor(
    private readonly _cacheService: CacheService,
    private readonly _adminPlansRepo: AdminPlansRepository,
  ) {}

  /**
   * Helper function to convert BigInt fields to strings for JSON serialization
   * @param obj - Object containing BigInt fields
   * @returns Object with BigInt fields converted to strings
   */
  private convertBigIntToString(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return obj.toString();
    if (obj instanceof Date) return obj.toISOString();
    if (Array.isArray(obj)) return obj.map((item) => this.convertBigIntToString(item));
    if (typeof obj === 'object') {
      const converted = { ...obj };
      for (const key in converted) {
        if (Object.prototype.hasOwnProperty.call(converted, key)) {
          converted[key] = this.convertBigIntToString(converted[key]);
        }
      }
      return converted;
    }
    return obj;
  }

  private formatPlanVersion(plan: any) {
    if (!plan) return null;
    const {
      id,
      code,
      name,
      price,
      camera_quota,
      retention_days,
      caregiver_seats,
      sites,
      major_updates_months,
      storage_size,
      is_recommended,
      tier,
      currency,
      status,
      is_current,
      version,
      effective_from,
      effective_to,
      created_at,
      updated_at,
    } = plan;

    return {
      id,
      code,
      name,
      price,
      camera_quota,
      retention_days,
      caregiver_seats,
      sites,
      major_updates_months,
      storage_size,
      is_recommended,
      tier,
      currency,
      status,
      is_current: Boolean(is_current),
      version,
      effective_from,
      effective_to,
      created_at,
      updated_at,
    };
  }

  private sortPlanVersions(versions: any[]) {
    return versions.slice().sort((a, b) => {
      const timeA = new Date(a?.effective_from || a?.created_at || 0).getTime();
      const timeB = new Date(b?.effective_from || b?.created_at || 0).getTime();
      return timeB - timeA;
    });
  }

  /**
   * Lấy danh sách tất cả plans với caching và options
   * @param options - Options cho query
   * @returns Danh sách plans từ database hoặc cache
   */
  async getPlans(options?: { includeAllVersions?: boolean }) {
    const includeAllVersions = options?.includeAllVersions || false;
    const cacheKey = includeAllVersions ? 'admin-plans:all-versions' : 'admin-plans:current';

    const cached = await this._cacheService.get(cacheKey);
    if (cached) return cached;

    const plans = await this._adminPlansRepo.findPlansWithVersions(includeAllVersions);

    let payload: any;

    if (includeAllVersions) {
      const grouped = new Map<string, { current?: any; versions: any[] }>();

      for (const plan of plans) {
        const formatted = this.formatPlanVersion(plan);
        if (!formatted) continue;

        const bucket = grouped.get(formatted.code) || { versions: [] };
        bucket.versions.push(formatted);
        if (formatted.is_current) {
          bucket.current = formatted;
        }
        grouped.set(formatted.code, bucket);
      }

      payload = Array.from(grouped.entries()).map(([code, group]) => {
        const sortedVersions = this.sortPlanVersions(group.versions).map((v) => ({ ...v }));
        const baseVersion = group.current || sortedVersions[0] || null;

        if (!baseVersion) {
          return {
            code,
            versions: [],
            version_count: 0,
          };
        }

        return {
          ...baseVersion,
          versions: sortedVersions,
          version_count: sortedVersions.length,
        };
      });
    } else {
      payload = plans.map((plan) => this.formatPlanVersion(plan)).filter(Boolean);
    }

    const result = this.convertBigIntToString(payload);
    await this._cacheService.set(cacheKey, result, { ttl: 600 });
    return result;
  }

  /**
   * Lấy thông tin một plan theo code (không kèm phiên bản)
   * @param code - Mã code của plan
   */
  async getPlan(code: string) {
    const cacheKey = `admin-plans:${code}`;
    const cached = await this._cacheService.get(cacheKey);
    if (cached) return cached;

    const plan = await this._adminPlansRepo.findPlanByCode(code);

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    await this._cacheService.set(cacheKey, plan, { ttl: 900 });
    return this.convertBigIntToString(plan);
  }

  /**
   * Lấy thông tin plan kèm theo phiên bản hiện tại
   * @param code - Mã code của plan
   * @returns Thông tin plan với phiên bản hiện tại (nếu có)
   */
  async getPlanWithCurrentVersion(code: string) {
    const cacheKey = `admin-plans:${code}:with-version`;
    const cached = await this._cacheService.get(cacheKey);
    if (cached) return cached;

    // Get plan first
    const plan = await this._adminPlansRepo.findPlanByCode(code);
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const versions = await this._adminPlansRepo.findVersionsByPlanCode(code);
    const formattedPlan = this.formatPlanVersion(plan);
    const formattedVersions = this.sortPlanVersions(
      versions.map((version) => this.formatPlanVersion(version)).filter(Boolean),
    );

    const result = this.convertBigIntToString({
      ...formattedPlan,
      version_count: formattedVersions.length,
      versions: formattedVersions,
    });
    await this._cacheService.set(cacheKey, result, { ttl: 600 });
    return result;
  }

  /**
   * Kiểm tra plan có tồn tại không
   * @param code - Mã code của plan
   * @returns true nếu plan tồn tại, false nếu không
   */
  async planExists(code: string): Promise<boolean> {
    return await this._adminPlansRepo.planExists(code);
  }

  /**
   * Tạo một plan mới
   * @param body - Dữ liệu plan mới
   * @returns Thông tin plan được tạo
   */
  async createPlan(body: any) {
    const defaultVersion = '1.0';

    // Validate required fields
    if (
      !body.code ||
      !body.name ||
      !body.price ||
      body.camera_quota === undefined ||
      body.retention_days === undefined ||
      body.caregiver_seats === undefined
    ) {
      throw new BadRequestException('Missing required fields');
    }

    // Validate effective dates
    if (body.effective_from) {
      const now = new Date();
      if (body.effective_from < now) {
        throw new BadRequestException('effective_from cannot be in the past for new plans');
      }
    }

    if (!this._adminPlansRepo.validateEffectiveDates(body.effective_from, body.effective_to)) {
      throw new BadRequestException(
        'Invalid effective dates: effective_from cannot be in the past and must be before effective_to',
      );
    }

    // Check if plan already exists
    const version = body.version || defaultVersion;
    const exists = await this._adminPlansRepo.planVersionExists(body.code, version);
    if (exists) {
      throw new ConflictException(
        `Plan with code '${body.code}' and version '${version}' already exists`,
      );
    }

    // If creating a current plan, deactivate all other versions of the same code
    if (body.is_current === true) {
      await this._adminPlansRepo.deactivateAllVersionsOfCode(body.code);
    }

    // Create plan and initial version
    // Accept scalar `price` as the canonical plan price

    const result = await this._adminPlansRepo.createPlan({
      code: body.code,
      name: body.name,
      price: body.price,
      camera_quota: body.camera_quota,
      retention_days: body.retention_days,
      caregiver_seats: body.caregiver_seats,
      sites: body.sites,
      major_updates_months: body.major_updates_months,
      storage_size: body.storage_size,
      version: version,
      effective_from: body.effective_from || new Date(),
      is_current: body.is_current,
      tier: body.tier,
      currency: body.currency,
      status: body.status,
      effective_to: body.effective_to,
    } as any);

    await this._cacheService.deleteByPattern('admin-plans:*');
    return this.convertBigIntToString(result);
  }

  /**
   * Cập nhật plan
   * @param code - Mã code của plan
   * @param body - Dữ liệu cập nhật
   * @returns Thông tin plan sau khi cập nhật
   */
  async updatePlan(code: string, body: any) {
    const exists = await this._adminPlansRepo.planExists(code);
    if (!exists) {
      throw new NotFoundException(`Plan with code '${code}' not found`);
    }

    // Accept scalar `price` as the canonical plan price

    const result = await this._adminPlansRepo.updatePlan(code, body);
    await this._cacheService.deleteByPattern('admin-plans:*');
    return this.convertBigIntToString(result);
  }

  /**
   * Xóa plan
   * @param code - Mã code của plan cần xóa
   */
  async deletePlan(code: string) {
    // Accept either a plan code (base code) or a UUID id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    let planCodeToCheck: string | null = null;

    if (uuidRegex.test(code)) {
      // Provided identifier looks like a UUID -> find plan by id first
      const plan = await this._adminPlansRepo.findPlanById(code);
      if (!plan) {
        throw new NotFoundException(`Plan with id '${code}' not found`);
      }
      planCodeToCheck = plan.code;

      // If there are active subscriptions for this plan code, block deletion
      const hasSubs = await this._adminPlansRepo.hasActiveSubscriptionsByPlanCode(planCodeToCheck);
      if (hasSubs) {
        throw new ConflictException(
          'Cannot delete plan: active subscriptions exist for this plan code',
        );
      }

      // Soft-delete this specific plan version
      await this._adminPlansRepo.softDeletePlanById(code);
    } else {
      // Provided identifier is a plan code
      const exists = await this._adminPlansRepo.planExists(code);
      if (!exists) {
        throw new NotFoundException(`Plan with code '${code}' not found`);
      }

      // Block deletion if subscriptions exist for this plan code
      const hasSubs = await this._adminPlansRepo.hasActiveSubscriptionsByPlanCode(code);
      if (hasSubs) {
        throw new ConflictException(
          'Cannot delete plan: active subscriptions exist for this plan code',
        );
      }

      // Soft-delete all records for this plan code
      await this._adminPlansRepo.softDeletePlanByCode(code);
    }

    await this._cacheService.deleteByPattern('admin-plans:*');
  }

  /**
   * Lấy thống kê plans
   * @returns Thống kê về plans và subscriptions
   */
  async getPlanStatistics() {
    const cacheKey = 'admin-plans:statistics';
    const cached = await this._cacheService.get(cacheKey);
    if (cached) return cached;

    const stats = await this._adminPlansRepo.getPlanStatistics();
    const result = this.convertBigIntToString(stats);

    await this._cacheService.set(cacheKey, result, { ttl: 300 });
    return result;
  }

  /**
   * Methods for compatibility with controller - simplified implementations
   */

  /**
   * Lấy tất cả versions của một plan cụ thể
   * @param planCode - Mã code của plan
   */
  async getPlanVersions(planCode: string) {
    return await this._adminPlansRepo.findVersionsByPlanCode(planCode);
  }

  async getCurrentPlanVersion(planCode: string) {
    return await this.getPlanWithCurrentVersion(planCode);
  }

  async createPlanVersion(data: any) {
    // Validate CalVer format (YYYY.MM or YYYY.MM.DD)
    const calVerRegex = /^\d{4}\.\d{1,2}(\.\d{1,2})?$/;
    if (!calVerRegex.test(data.version)) {
      throw new BadRequestException('Version must follow CalVer format');
    }

    return await this._adminPlansRepo.createNewPlanVersion(data.plan_code, data);
  }

  async updatePlanVersion(id: string, data: any) {
    // For now, delegate to updatePlan
    return await this.updatePlan(id, data);
  }

  async deletePlanVersion(id: string) {
    // For now, delegate to deletePlan
    return await this.deletePlan(id);
  }

  async activatePlanVersion(id: string) {
    // First, get the plan to activate by ID
    const planToActivate = await this._adminPlansRepo.findPlanById(id);
    if (!planToActivate) {
      throw new NotFoundException('Plan version not found');
    }

    // Check if plan is already active
    if (planToActivate.is_current) {
      throw new BadRequestException('Plan version is already active');
    }

    // Get the base plan_code (without version suffix)
    const basePlanCode = planToActivate.code.split('-v')[0];

    this._logger.debug(
      '[activatePlanVersion] Debug: ' +
        JSON.stringify({
          planId: id,
          planCode: planToActivate.code,
          basePlanCode,
          willDeactivateOthersWithPrefix: basePlanCode,
          excludeCode: planToActivate.code,
        }),
    );

    // Deactivate all other versions of the same plan
    await this._adminPlansRepo.deactivateOtherVersionsByCode(basePlanCode, id);

    // Mark this version as current with proper effective dates
    const result = await this._adminPlansRepo.updatePlanById(id, {
      is_current: true,
      effective_from: new Date(), // Set ngày bắt đầu hiệu lực
      effective_to: undefined, // Clear ngày kết thúc
    });

    // Clear cache for this plan
    await this._cacheService.delete(`admin-plans:current`);
    await this._cacheService.delete(`admin-plans:all-versions`);
    await this._cacheService.delete(`admin-plan:${basePlanCode}`);

    return result;
  }

  async deactivatePlanVersion(id: string) {
    // First, get the plan to deactivate
    const planToDeactivate = await this._adminPlansRepo.findPlanById(id);
    if (!planToDeactivate) {
      throw new NotFoundException('Plan version not found');
    }

    // Check if plan is already inactive
    if (!planToDeactivate.is_current) {
      throw new BadRequestException('Plan version is already inactive');
    }

    // Mark this version as inactive
    const result = await this._adminPlansRepo.updatePlanById(id, {
      is_current: false,
      effective_to: new Date(), // Set end date to now
    });

    // Clear cache for this plan
    const basePlanCode = planToDeactivate.code.split('-v')[0];
    await this._cacheService.delete(`admin-plans:current`);
    await this._cacheService.delete(`admin-plans:all-versions`);
    await this._cacheService.delete(`admin-plan:${basePlanCode}`);

    return result;
  }

  async getPlanVersionByEffectiveDate(planCode: string, _date: string) {
    // Simple implementation - get current version
    return await this.getPlanWithCurrentVersion(planCode);
  }

  async comparePlanVersions(versionId1: string, versionId2: string) {
    const [version1, version2] = await Promise.all([
      this._adminPlansRepo.findPlanByCode(versionId1),
      this._adminPlansRepo.findPlanByCode(versionId2),
    ]);

    return {
      version1: this.convertBigIntToString(version1),
      version2: this.convertBigIntToString(version2),
      differences: this.calculateDifferences(version1, version2),
    };
  }

  async getPlanUsageStatistics(_years?: number) {
    return await this.getPlanStatistics();
  }

  async getPlanTrends(planCode: string, years?: number) {
    // Simple implementation
    return {
      planCode,
      trends: [],
      period: `${years || 1} years`,
    };
  }

  async getPlanComparison() {
    const plans = await this._adminPlansRepo.findPlansWithVersions(false);
    return {
      plans: this.convertBigIntToString(plans),
      comparison: [],
    };
  }

  private calculateDifferences(plan1: any, plan2: any) {
    if (!plan1 || !plan2) return [];

    const differences = [];
    const fields = ['price', 'camera_quota', 'retention_days', 'caregiver_seats', 'sites'];

    for (const field of fields) {
      if (plan1[field] !== plan2[field]) {
        differences.push({
          field,
          value1: plan1[field],
          value2: plan2[field],
        });
      }
    }

    return differences;
  }

  /**
   * Lấy tất cả plans đang hoạt động
   * @param targetDate - Ngày kiểm tra (mặc định là hôm nay)
   */
  async getActivePlans(targetDate?: Date): Promise<any[]> {
    const plans = await this._adminPlansRepo.getActivePlans(targetDate);
    return this.convertBigIntToString(plans);
  }

  /**
   * Kiểm tra plan có đang hoạt động không
   * @param planCode - Mã code của plan
   * @param targetDate - Ngày kiểm tra (mặc định là hôm nay)
   */
  async isPlanActive(planCode: string, targetDate?: Date): Promise<boolean> {
    return await this._adminPlansRepo.isPlanActive(planCode, targetDate);
  }

  /**
   * Lấy plan được khuyến nghị đang hoạt động
   * @param targetDate - Ngày kiểm tra (mặc định là hôm nay)
   */
  async getRecommendedPlan(targetDate?: Date): Promise<any> {
    const plan = await this._adminPlansRepo.getRecommendedPlan(targetDate);
    return this.convertBigIntToString(plan);
  }

  /**
   * Lấy plans theo tier
   * @param tier - Tier của plan
   * @param targetDate - Ngày kiểm tra (mặc định là hôm nay)
   */
  async getPlansByTier(tier: number, targetDate?: Date): Promise<any[]> {
    const plans = await this._adminPlansRepo.getPlansByTier(tier, targetDate);
    return this.convertBigIntToString(plans);
  }

  /**
   * Lấy plans available cho subscription
   * (Alias cho getActivePlans với tên rõ ràng hơn)
   */
  async getAvailablePlansForSubscription(): Promise<any[]> {
    return await this.getActivePlans();
  }

  /**
   * Validate plan có thể được subscribe không
   * @param planCode - Mã code của plan
   */
  async validatePlanForSubscription(planCode: string): Promise<{
    valid: boolean;
    message: string;
    plan?: any;
  }> {
    const isActive = await this.isPlanActive(planCode);

    if (!isActive) {
      return {
        valid: false,
        message: 'Plan is not currently available for subscription',
      };
    }

    const plan = await this._adminPlansRepo.findPlanByCode(planCode);

    return {
      valid: true,
      message: 'Plan is available for subscription',
      plan: this.convertBigIntToString(plan),
    };
  }
}
