// src/presentation/guards/quota.guard.ts
/**
 * QuotaGuard - Bảo vệ API endpoints dựa trên quota từ subscription
 *
 * Cách thức hoạt động:
 * 1. Nhận site_id từ header 'x-site-id'
 * 2. Map site_id sang user_id thông qua QuotaService
 * 3. Lấy quota hiệu lực từ subscription của user
 * 4. Kiểm tra giới hạn dựa trên loại quota (camera/event/caregiver)
 * 5. Throw BadRequestException nếu vượt quota
 *
 * Sự khác biệt với license-based:
 * - Trước: Kiểm tra license_activations và license quotas
 * - Sau: Kiểm tra subscription và plan quotas
 * - Ưu điểm: Đơn giản hóa, tập trung vào user-level quotas
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  mixin,
  Type,
  BadRequestException,
} from '@nestjs/common';
import { QuotaService } from '../../application/services/admin/quota.service';

export type QuotaKind = 'camera' | 'event' | 'caregiver';

export function QuotaGuard(kind: QuotaKind): Type<CanActivate> {
  @Injectable()
  class QuotaGuardMixin implements CanActivate {
    constructor(private readonly quota: QuotaService) {
      // Note: 'quota' parameter is used in canActivate() method via 'this.quota'
      // TypeScript may not recognize usage in mixin pattern, but it's actually used
    }

    /**
     * Kiểm tra quota trước khi cho phép request
     *
     * @param ctx ExecutionContext chứa request information
     * @returns true nếu cho phép, throw exception nếu không
     */
    async canActivate(ctx: ExecutionContext): Promise<boolean> {
      const req = ctx.switchToHttp().getRequest();
      const siteId = (req.headers['x-site-id'] as string)?.trim();

      // Validate site_id header
      if (!siteId) {
        throw new BadRequestException('x-site-id header is required');
      }

      // Lấy quota từ subscription
      const limits = await this.quota.getEffectiveQuotaBySite(siteId);

      // Kiểm tra từng loại quota
      if (kind === 'camera') {
        const used = await this.quota.countCamerasBySite(siteId);
        if (used >= limits.camera_quota) {
          throw new BadRequestException('Camera quota exceeded');
        }
      }

      if (kind === 'event') {
        const used = await this.quota.countEvents30dBySite(siteId);
        // Giả sử có giới hạn events, nếu không có thì bỏ qua hoặc set mặc định
        const maxEvents = limits.camera_quota * 100; // Ví dụ: 100 events per camera
        if (used >= maxEvents) {
          throw new BadRequestException('AI events quota exceeded (30d)');
        }
      }

      if (kind === 'caregiver') {
        const used = await this.quota.countCaregiversBySite(siteId);
        if (used >= limits.caregiver_seats) {
          throw new BadRequestException('Caregiver seats exceeded');
        }
      }

      // Attach limits cho downstream handlers nếu cần
      req.planLimits = limits;
      return true;
    }
  }
  return mixin(QuotaGuardMixin);
}
