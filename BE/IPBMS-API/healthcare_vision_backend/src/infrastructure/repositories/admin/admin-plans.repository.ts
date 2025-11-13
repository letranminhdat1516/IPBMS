import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

interface PlanData {
  code: string;
  name: string;
  price: bigint;
  camera_quota: number;
  retention_days: number;
  caregiver_seats: number;
  sites: number;
  major_updates_months?: number;
  storage_size?: string;
  version?: string;
  is_current?: boolean;
  effective_from?: Date;
  effective_to?: Date;
  is_recommended?: boolean;
  tier?: number;
  currency?: string;
  status?: 'available' | 'unavailable' | 'deprecated';
}

@Injectable()
export class AdminPlansRepository extends BasePrismaRepository {
  private readonly _logger = new Logger(AdminPlansRepository.name);
  constructor(prisma: PrismaService, unitOfWork: UnitOfWork) {
    super(prisma, unitOfWork);
  }

  /**
   * Map API status to database enum
   */
  private mapStatusToDb(status: 'available' | 'unavailable' | 'deprecated'): string {
    switch (status) {
      case 'unavailable':
        return 'archived';
      default:
        return status;
    }
  }

  /**
   * Map database enum to API status
   */
  private mapStatusFromDb(status: string): 'available' | 'unavailable' | 'deprecated' {
    switch (status) {
      case 'archived':
        return 'unavailable';
      default:
        return status as 'available' | 'deprecated';
    }
  }

  /**
   * Lấy danh sách plans với các options
   * @param includeAllVersions - true: lấy tất cả plans, false: chỉ lấy plans hiện tại (available status)
   */
  async findPlansWithVersions(includeAllVersions: boolean = false) {
    const whereClause = includeAllVersions
      ? {}
      : {
          status: 'available' as const,
          is_current: true,
        };

    return await this.prisma.plans.findMany({
      where: whereClause,
      orderBy: [{ code: 'asc' }, { effective_from: 'desc' }, { created_at: 'desc' }],
    });
  }

  /**
   * Lấy tất cả versions của một plan cụ thể theo plan code
   * @param planCode - Mã code của plan
   */
  async findVersionsByPlanCode(planCode: string) {
    return await this.prisma.plans.findMany({
      where: {
        code: planCode,
      },
      orderBy: [{ effective_from: 'desc' }, { created_at: 'desc' }],
    });
  }

  /**
   * Tìm plan theo code (current active version only)
   *
   * @param code - Mã code của plan
   * @returns Current active plan with the given code, or null if not found
   *
   * Compound key handling: Uses code + is_current filter to get the active version
   * since multiple versions of the same plan code can exist with @@unique([code, version])
   */
  async findPlanByCode(code: string) {
    return await this.prisma.plans.findFirst({
      where: {
        code,
        is_current: true,
      },
    });
  }

  /**
   * Tìm plan theo ID
   *
   * @param id - UUID của plan
   * @returns Plan object hoặc null
   */
  async findPlanById(id: string) {
    return await this.prisma.plans.findUnique({
      where: {
        id,
      },
    });
  }

  /**
   * Kiểm tra plan có tồn tại không (current active version only)
   *
   * @param code - Mã code của plan
   * @returns true if current active plan exists, false otherwise
   *
   * Compound key handling: Uses code + is_current filter to check active version only
   */
  async planExists(code: string): Promise<boolean> {
    const plan = await this.prisma.plans.findFirst({
      where: {
        code,
        is_current: true,
      },
      select: { code: true },
    });
    return !!plan;
  }

  /**
   * Check if plan with specific code and version exists
   *
   * @param code - The plan code to check
   * @param version - The specific version to check
   * @returns true if a plan with the exact code+version combination exists, false otherwise
   *
   * Compound key handling: Uses exact code+version match for the @@unique([code, version]) constraint
   * This method checks for specific version existence, not just current active plans
   */
  async planVersionExists(code: string, version: string): Promise<boolean> {
    const plan = await this.prisma.plans.findFirst({
      where: {
        code,
        version,
      },
      select: { code: true },
    });
    return !!plan;
  }

  /**
   * Deactivate all versions of the same plan code
   *
   * Sets is_current = false for all existing versions of a plan code
   * This ensures only one version can be active at a time
   *
   * @param code - The plan code to deactivate all versions for
   *
   * Compound key handling: Updates all records with matching code regardless of version
   * Used before activating a new version to maintain single active version constraint
   */
  async deactivateAllVersionsOfCode(code: string): Promise<void> {
    await this.prisma.plans.updateMany({
      where: {
        code,
        is_current: true,
      },
      data: {
        is_current: false,
      },
    });
  }

  /**
   * Tạo plan mới
   * @param data - Dữ liệu plan
   */
  async createPlan(data: PlanData) {
    return await this.prisma.plans.create({
      data: {
        code: data.code,
        name: data.name,
        price: data.price,
        camera_quota: data.camera_quota,
        retention_days: data.retention_days,
        caregiver_seats: data.caregiver_seats,
        sites: data.sites || 1,
        major_updates_months: data.major_updates_months || 24,
        storage_size: data.storage_size || '100GB',
        version: data.version || '1.0',
        is_current: data.is_current ?? true,
        effective_from: data.effective_from || new Date(),
        effective_to: data.effective_to || null,
        is_recommended: data.is_recommended || false,
        tier: data.tier || 1,
        currency: data.currency || 'VND',
        status: (data.status ? this.mapStatusToDb(data.status) : 'available') as any,
      },
    });
  }

  /**
   * Cập nhật plan
   * @param code - Mã code của plan
   * @param data - Dữ liệu cập nhật
   */
  async updatePlan(code: string, data: Partial<PlanData>) {
    // Find the current plan first
    const existingPlan = await this.prisma.plans.findFirst({
      where: { code, is_current: true },
      select: { id: true },
    });

    if (!existingPlan) {
      throw new NotFoundException(`Plan with code ${code} not found`);
    }

    return await this.prisma.plans.update({
      where: { id: existingPlan.id },
      data: {
        name: data.name,
        price: data.price,
        camera_quota: data.camera_quota,
        retention_days: data.retention_days,
        caregiver_seats: data.caregiver_seats,
        sites: data.sites,
        major_updates_months: data.major_updates_months,
        storage_size: data.storage_size,
        version: data.version,
        is_current: data.is_current,
        effective_from: data.effective_from,
        effective_to: data.effective_to,
        is_recommended: data.is_recommended,
        tier: data.tier,
        currency: data.currency,
        status: data.status ? (this.mapStatusToDb(data.status) as any) : undefined,
      },
    });
  }

  /**
   * Cập nhật plan theo ID
   */
  async updatePlanById(id: string, data: Partial<PlanData>) {
    return await this.prisma.plans.update({
      where: { id },
      data: {
        name: data.name,
        price: data.price,
        camera_quota: data.camera_quota,
        retention_days: data.retention_days,
        caregiver_seats: data.caregiver_seats,
        sites: data.sites,
        major_updates_months: data.major_updates_months,
        storage_size: data.storage_size,
        version: data.version,
        is_current: data.is_current,
        effective_from: data.effective_from,
        effective_to: data.effective_to,
        is_recommended: data.is_recommended,
        tier: data.tier,
        currency: data.currency,
        status: data.status ? (this.mapStatusToDb(data.status) as any) : undefined,
      },
    });
  }

  /**
   * Xóa plan
   * @param code - Mã code của plan
   */
  async deletePlan(code: string) {
    // Find the current plan first
    const existingPlan = await this.prisma.plans.findFirst({
      where: { code, is_current: true },
      select: { id: true },
    });

    if (!existingPlan) {
      throw new NotFoundException(`Plan with code ${code} not found`);
    }

    return await this.prisma.plans.delete({
      where: { id: existingPlan.id },
    });
  }

  /**
   * Delete plan by its UUID id
   * @param id - UUID of the plan record
   */
  async deletePlanById(id: string) {
    return await this.prisma.plans.delete({
      where: { id },
    });
  }

  /**
   * Soft-delete a plan record by setting status to 'deprecated', clearing current flag and setting effective_to
   * @param id - UUID of the plan record
   */
  async softDeletePlanById(id: string) {
    return await this.prisma.plans.update({
      where: { id },
      data: {
        status: 'deprecated',
        is_current: false,
        effective_to: new Date(),
      },
    });
  }

  /**
   * Soft-delete all plan records with the given code
   * @param code - plan code
   */
  async softDeletePlanByCode(code: string) {
    return await this.prisma.plans.updateMany({
      where: { code },
      data: {
        status: 'deprecated',
        is_current: false,
        effective_to: new Date(),
      },
    });
  }

  /**
   * Check whether there are active subscriptions referencing this plan code
   * @param planCode
   */
  async hasActiveSubscriptionsByPlanCode(planCode: string): Promise<boolean> {
    const count = await this.prisma.subscriptions.count({
      where: {
        plan_code: planCode,
        status: 'active',
      },
    });
    return count > 0;
  }

  /**
   * Lấy thống kê về plans
   */
  async getPlanStatistics() {
    const [totalPlans, activeSubscriptions] = await Promise.all([
      this.prisma.plans.count(),
      this.prisma.subscriptions.count({
        where: {
          status: 'active',
        },
      }),
    ]);

    // Lấy plan phổ biến nhất
    const popularPlan = await this.prisma.subscriptions.groupBy({
      by: ['plan_code'],
      _count: {
        plan_code: true,
      },
      orderBy: {
        _count: {
          plan_code: 'desc',
        },
      },
      take: 1,
    });

    return {
      totalPlans,
      activeSubscriptions,
      mostPopularPlan: popularPlan[0]?.plan_code || null,
      mostPopularPlanCount: popularPlan[0]?._count.plan_code || 0,
    };
  }

  /**
   * Lấy plans theo status
   * @param status - Trạng thái plan
   */
  async findPlansByStatus(status: 'available' | 'unavailable' | 'deprecated') {
    return await this.prisma.plans.findMany({
      where: { status: this.mapStatusToDb(status) as any },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  /**
   * Lấy plans được khuyến nghị
   */
  async findRecommendedPlans() {
    return await this.prisma.plans.findMany({
      where: {
        is_recommended: true,
        status: 'available',
      },
      orderBy: {
        tier: 'asc',
      },
    });
  }

  /**
   * Tạo plan version mới và deactivate version cũ
   * @param planCode - Mã code của plan
   * @param newVersionData - Dữ liệu version mới
   */
  async createNewPlanVersion(planCode: string, newVersionData: Partial<PlanData>) {
    return await this.prisma.$transaction(async (tx) => {
      // Đánh dấu plan hiện tại không còn current
      await tx.plans.updateMany({
        where: {
          code: planCode,
          is_current: true,
        },
        data: {
          is_current: false,
          effective_to: new Date(),
        },
      });

      // Tạo plan version mới
      return await tx.plans.create({
        data: {
          code: planCode,
          name: newVersionData.name || `${planCode} - Version ${newVersionData.version}`,
          price: newVersionData.price!,
          camera_quota: newVersionData.camera_quota!,
          retention_days: newVersionData.retention_days!,
          caregiver_seats: newVersionData.caregiver_seats!,
          sites: newVersionData.sites || 1,
          major_updates_months: newVersionData.major_updates_months || 24,
          storage_size: newVersionData.storage_size ? `${newVersionData.storage_size}GB` : '100GB',
          version: newVersionData.version!,
          is_current: true,
          effective_from: newVersionData.effective_from
            ? new Date(newVersionData.effective_from)
            : new Date(),
          effective_to: newVersionData.effective_to ? new Date(newVersionData.effective_to) : null,
          is_recommended: newVersionData.is_recommended || false,
          tier: newVersionData.tier || 1,
          currency: newVersionData.currency || 'VND',
          status: newVersionData.status
            ? (this.mapStatusToDb(newVersionData.status) as any)
            : 'available',
        },
      });
    });
  }

  /**
   * Deactivate tất cả versions khác của cùng một plan
   * @param basePlanCode - Mã base plan code
   * @param excludeId - ID của plan version không bị deactivate
   */
  async deactivateOtherVersionsByCode(basePlanCode: string, excludeId: string) {
    this._logger.debug(
      '[deactivateOtherVersionsByCode] Input: ' + JSON.stringify({ basePlanCode, excludeId }),
    );

    const result = await this.prisma.plans.updateMany({
      where: {
        AND: [
          {
            code: {
              startsWith: basePlanCode,
            },
          },
          {
            id: {
              not: excludeId,
            },
          },
          {
            is_current: true,
          },
        ],
      },
      data: {
        is_current: false,
        effective_to: new Date(),
      },
    });

    this._logger.debug('[deactivateOtherVersionsByCode] Updated count: ' + result.count);
    return result;
  }

  /**
   * @deprecated Use deactivateOtherVersionsByCode instead
   */
  async deactivateOtherVersions(basePlanCode: string, excludeCode: string) {
    this._logger.debug(
      '[deactivateOtherVersions] Input: ' + JSON.stringify({ basePlanCode, excludeCode }),
    );

    const result = await this.prisma.plans.updateMany({
      where: {
        AND: [
          {
            code: {
              startsWith: basePlanCode,
            },
          },
          {
            code: {
              not: excludeCode,
            },
          },
          {
            is_current: true,
          },
        ],
      },
      data: {
        is_current: false,
        effective_to: new Date(),
      },
    });

    this._logger.debug('[deactivateOtherVersions] Updated count: ' + result.count);
    return result;
  }

  /**
   * Lấy plan version hiệu lực tại một thời điểm cụ thể
   * @param planCode - Base plan code
   * @param targetDate - Ngày muốn kiểm tra (mặc định là hôm nay)
   */
  async getPlanByEffectiveDate(planCode: string, targetDate: Date = new Date()) {
    return await this.prisma.plans.findFirst({
      where: {
        code: {
          startsWith: planCode,
        },
        effective_from: {
          lte: targetDate, // Bắt đầu hiệu lực <= targetDate
        },
        OR: [
          {
            effective_to: null, // Chưa có ngày kết thúc
          },
          {
            effective_to: {
              gt: targetDate, // Hoặc kết thúc > targetDate
            },
          },
        ],
      },
      orderBy: {
        effective_from: 'desc', // Lấy version mới nhất
      },
    });
  }

  /**
   * Kiểm tra tính hợp lệ của effective dates
   * @param effectiveFrom - Ngày bắt đầu
   * @param effectiveTo - Ngày kết thúc (tùy chọn)
   */
  validateEffectiveDates(effectiveFrom?: Date, effectiveTo?: Date): boolean {
    if (!effectiveFrom) return true; // Null/undefined là hợp lệ

    // Nếu có effective_to, phải > effective_from
    if (effectiveTo && effectiveTo <= effectiveFrom) {
      return false;
    }

    return true;
  }

  /**
   * Lấy tất cả plans đang hoạt động (active)
   * @param targetDate - Ngày kiểm tra (mặc định là hôm nay)
   */
  async getActivePlans(targetDate: Date = new Date()) {
    return await this.prisma.plans.findMany({
      where: {
        is_current: true,
        status: 'available',
        effective_from: {
          lte: targetDate,
        },
        OR: [
          { effective_to: null },
          {
            effective_to: {
              gt: targetDate,
            },
          },
        ],
      },
      orderBy: { price: 'asc' },
    });
  }

  /**
   * Kiểm tra một plan cụ thể có đang hoạt động không
   * @param planCode - Mã code của plan
   * @param targetDate - Ngày kiểm tra (mặc định là hôm nay)
   */
  async isPlanActive(planCode: string, targetDate: Date = new Date()): Promise<boolean> {
    const plan = await this.prisma.plans.findFirst({
      where: { code: planCode, is_current: true },
      select: {
        is_current: true,
        status: true,
        effective_from: true,
        effective_to: true,
      },
    });

    if (!plan) return false;

    return (
      plan.is_current === true &&
      plan.status === 'available' &&
      plan.effective_from !== null &&
      plan.effective_from <= targetDate &&
      (plan.effective_to === null || plan.effective_to > targetDate)
    );
  }

  /**
   * Lấy plan được khuyến nghị đang hoạt động
   */
  async getRecommendedPlan(targetDate: Date = new Date()) {
    return await this.prisma.plans.findFirst({
      where: {
        is_current: true,
        status: 'available',
        is_recommended: true,
        effective_from: {
          lte: targetDate,
        },
        OR: [
          { effective_to: null },
          {
            effective_to: {
              gt: targetDate,
            },
          },
        ],
      },
    });
  }

  /**
   * Lấy plans theo tier và trạng thái active
   * @param tier - Tier của plan
   * @param targetDate - Ngày kiểm tra
   */
  async getPlansByTier(tier: number, targetDate: Date = new Date()) {
    return await this.prisma.plans.findMany({
      where: {
        tier,
        is_current: true,
        status: 'available',
        effective_from: {
          lte: targetDate,
        },
        OR: [
          { effective_to: null },
          {
            effective_to: {
              gt: targetDate,
            },
          },
        ],
      },
      orderBy: { price: 'asc' },
    });
  }
}
