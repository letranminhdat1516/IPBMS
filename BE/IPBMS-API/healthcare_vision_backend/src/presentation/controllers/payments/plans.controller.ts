import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
  Param,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { SubscriptionService } from '../../../application/services';
import {
  ApiResponseCurrentPlanDto,
  ApiResponsePlanArrayDto,
  ApiResponsePlanDto,
  ApiResponseUpdateQuotaDto,
  ApiResponseUpgradeDto,
} from '../../../application/dto/plans/plan-response.dto';
import {
  ManualRenewRequestDto,
  UpdateQuotaDto,
  UpgradePlanDto,
} from '../../../application/dto/plans/plan.dto';
import { AdminPlansService } from '../../../application/services/admin';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { Public } from '../../../shared/decorators/public.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { PlanSwagger } from '../../../swagger/plan.swagger';
import { timeUtils } from '../../../shared/constants/time.constants';

@ApiTags('plan')
@Controller('plan')
export class PlanController {
  private readonly logger = new Logger(PlanController.name);

  constructor(
    private readonly _subscriptionService: SubscriptionService,
    private readonly _adminPlansService: AdminPlansService,
  ) {}

  // ========== PLAN LISTING APIs (merged from plans.controller) ==========

  @Get()
  @Public()
  @ApiOkResponse({ type: ApiResponsePlanArrayDto })
  async getAllPlans() {
    try {
      const plans = await this._adminPlansService.getPlans();
      if (!plans || !Array.isArray(plans)) {
        throw new NotFoundException('Không tìm thấy gói dịch vụ nào');
      }
      const now = new Date();
      return {
        success: true,
        data: plans,
        message: 'Lấy danh sách plans thành công',
        timestamp: now.toISOString(),
        timestamp_local: timeUtils.toTimezoneIsoString(now),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      throw new BadRequestException(`Lấy danh sách plans thất bại: ${errorMessage}`);
    }
  }

  @Get(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @ApiParam({ name: 'code', description: 'Mã code của plan', required: true, example: 'premium' })
  @ApiOkResponse({ type: ApiResponsePlanDto })
  async getPlanByCode(@Param('code') code: string) {
    try {
      const plan = await this._adminPlansService.getPlanWithCurrentVersion(code);
      if (!plan) {
        throw new NotFoundException('Không tìm thấy gói dịch vụ với code này');
      }
      const now = new Date();
      return {
        success: true,
        data: plan,
        message: 'Lấy thông tin plan thành công',
        timestamp: now.toISOString(),
        timestamp_local: timeUtils.toTimezoneIsoString(now),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      throw new BadRequestException(`Lấy thông tin plan thất bại: ${errorMessage}`);
    }
  }

  // ========== PLAN OPERATIONS APIs ==========

  @Put('upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @PlanSwagger.upgradePlan
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Optional idempotency key để tránh xử lý trùng lặp',
    required: false,
  })
  @ApiBody({ type: UpgradePlanDto })
  @ApiOkResponse({ type: ApiResponseUpgradeDto })
  @LogActivity({
    action: 'upgrade_subscription_plan',
    action_enum: ActivityAction.UPDATE,
    message: 'Nâng cấp gói dịch vụ',
    resource_type: 'subscription_plan',
    resource_name: 'Plan',
    severity: ActivitySeverity.MEDIUM,
  })
  async upgradePlan(@Req() req: any, @Body() body: UpgradePlanDto) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('Thiếu thông tin userId trong JWT token');
    if (!body.plan_code) throw new BadRequestException('Thiếu plan_code trong request body');
    // Read idempotency key from header (case-insensitive)
    const idempotencyKey =
      (req.get && req.get('Idempotency-Key')) || req.headers?.['idempotency-key'] || null;

    try {
      const currentSub = await this._subscriptionService.getActive(userId);
      if (!currentSub) throw new NotFoundException('Không tìm thấy subscription đang hoạt động');

      const result = await this._subscriptionService.prepareUpgrade({
        userId,
        subscriptionId: currentSub.subscription_id,
        plan_code: body.plan_code,
        paymentProvider: body.payment_provider || 'vn_pay',
        idempotencyKey,
      } as any);

      return {
        ...result,
        idempotencyKey,
        message:
          Number(result.amountDue) > 0
            ? `Chỉ cần thanh toán thêm ${result.amountDue} VND cho phần chênh lệch`
            : 'Nâng cấp miễn phí - áp dụng ngay',
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new BadRequestException('Không thể thực hiện nâng cấp gói dịch vụ');
    }
  }

  private getClientIp(req: any): string {
    const forwarded = req.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return String(forwarded[0]).trim();
    }
    return (
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.headers?.['x-real-ip'] ||
      '127.0.0.1'
    );
  }

  @Get('renew')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @PlanSwagger.getRenewalStatus
  async getPendingRenewal(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Thiếu thông tin userId trong JWT token');
    }

    const pending = await this._subscriptionService.getPendingManualRenewal(userId);
    const now = new Date();
    return {
      success: true,
      data: pending,
      message: pending ? 'Đang có payment gia hạn pending' : 'Không có payment gia hạn pending',
      timestamp: now.toISOString(),
      timestamp_local: timeUtils.toTimezoneIsoString(now),
    };
  }

  @Put('renew')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @PlanSwagger.renewPlan
  @ApiBody({ type: ManualRenewRequestDto, required: false })
  @LogActivity({
    action: 'renew_subscription_plan',
    action_enum: ActivityAction.UPDATE,
    message: 'Tạo liên kết thanh toán gia hạn gói',
    resource_type: 'subscription_plan',
    resource_name: 'Plan',
    severity: ActivitySeverity.LOW,
  })
  async renewCurrentPlan(@Req() req: any, @Body() body: ManualRenewRequestDto = {}) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Thiếu thông tin userId trong JWT token');
    }

    try {
      const clientIp = this.getClientIp(req);
      const result = await this._subscriptionService.requestManualRenewal(userId, {
        ipAddress: clientIp,
        billingPeriod: body.billing_period,
        billingType: body.billing_type,
      });

      const now = new Date();
      return {
        success: true,
        data: result,
        message: 'Đã tạo liên kết thanh toán gia hạn gói dịch vụ',
        timestamp: now.toISOString(),
        timestamp_local: timeUtils.toTimezoneIsoString(now),
      };
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Không xác định';
      this.logger.error(
        `[renewCurrentPlan] Không thể tạo link gia hạn cho user ${userId}: ${errMessage}`,
      );
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Không thể tạo link thanh toán gia hạn',
      );
    }
  }

  @Delete('renew')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @PlanSwagger.cancelRenewal
  @LogActivity({
    action: 'cancel_renewal_payment',
    action_enum: ActivityAction.UPDATE,
    message: 'Hủy payment gia hạn gói',
    resource_type: 'subscription_plan',
    resource_name: 'Plan',
    severity: ActivitySeverity.LOW,
  })
  async cancelPendingRenewal(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Thiếu thông tin userId trong JWT token');
    }

    try {
      const result = await this._subscriptionService.cancelPendingManualRenewal(userId);
      const now = new Date();
      return {
        success: true,
        data: result,
        message: 'Đã hủy payment gia hạn đang chờ',
        timestamp: now.toISOString(),
        timestamp_local: timeUtils.toTimezoneIsoString(now),
      };
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Không xác định';
      this.logger.error(
        `[cancelPendingRenewal] Không thể hủy payment gia hạn cho user ${userId}: ${errMessage}`,
      );
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Không thể hủy payment gia hạn',
      );
    }
  }

  @Put('downgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @PlanSwagger.downgradePlan
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Optional idempotency key để tránh xử lý trùng lặp',
    required: false,
  })
  @ApiBody({ type: UpgradePlanDto })
  @ApiOkResponse({ type: ApiResponseUpgradeDto })
  @LogActivity({
    action: 'downgrade_subscription_plan',
    action_enum: ActivityAction.UPDATE,
    message: 'Hạ cấp gói dịch vụ',
    resource_type: 'subscription_plan',
    resource_name: 'Plan',
    severity: ActivitySeverity.MEDIUM,
  })
  async downgradePlan(@Req() req: any, @Body() body: UpgradePlanDto) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('Thiếu thông tin userId trong JWT token');
    if (!body.plan_code) throw new BadRequestException('Thiếu plan_code trong request body');

    try {
      const currentSub = await this._subscriptionService.getActive(userId);
      if (!currentSub) throw new NotFoundException('Không tìm thấy subscription đang hoạt động');

      // Read idempotency key from header (case-insensitive)
      const idempotencyKey =
        (req.get && req.get('Idempotency-Key')) || req.headers?.['idempotency-key'] || null;

      // Nếu service hỗ trợ scheduleDowngrade (saga), gọi runtime; nếu không, giữ policy hiện tại
      const scheduleFn = (this._subscriptionService as any).scheduleDowngrade;
      if (typeof scheduleFn === 'function') {
        const effectiveAt = currentSub.current_period_end || new Date();
        const scheduleResult = await scheduleFn.call(this._subscriptionService, {
          userId,
          subscriptionId: currentSub.subscription_id,
          plan_code: body.plan_code,
          effectiveAt,
          idempotencyKey,
        } as any);

        const now = new Date();
        return {
          success: true,
          data: scheduleResult,
          message: `Hạ cấp được lập lịch thành công (sẽ áp dụng vào ${
            effectiveAt ? new Date(effectiveAt).toISOString() : 'ngay'
          })`,
          timestamp: now.toISOString(),
          timestamp_local: timeUtils.toTimezoneIsoString(now),
        };
      }

      // Fallback: theo policy hiện tại (không cho hạ cấp giữa kỳ)
      throw new BadRequestException(
        'Không hỗ trợ hạ cấp giữa kỳ. Vui lòng hủy subscription để về Basic vào cuối kỳ hiện tại.',
      );

      // Code cũ - không dùng nữa
      /*
      const now = new Date();
      if (currentSub.current_period_end && now < currentSub.current_period_end) {
        throw new BadRequestException(
          'Không thể hạ cấp khi chưa hết hạn gói hiện tại. Vui lòng sử dụng hết thời hạn hiện tại.',
        );
      }

      const result = await this._subscriptionService.prepareDowngrade({
        userId,
        subscriptionId: currentSub.subscription_id,
        plan_code: body.plan_code,
        paymentProvider: body.payment_provider,
      });

      return {
        success: result.status === 'success',
        data: {
          ...result,
          message:
            Number(result.amountRefunded) > 0
              ? `Hoàn tiền ${result.amountRefunded} VND`
              : 'Hạ cấp miễn phí - áp dụng từ kỳ tiếp theo',
        },
        message:
          result.status === 'success'
            ? 'Chuẩn bị hạ cấp plan thành công'
            : 'Chuẩn bị hạ cấp plan thất bại',
        timestamp: new Date(),
      };
      */
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new BadRequestException('Không thể thực hiện hạ cấp gói dịch vụ');
    }
  }

  @Put('quota')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @PlanSwagger.updateQuota
  @ApiBody({ type: UpdateQuotaDto })
  @ApiOkResponse({ type: ApiResponseUpdateQuotaDto })
  @LogActivity({
    action: 'adjust_quota',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật quota người dùng',
    resource_type: 'quota',
    resource_name: 'User Quota',
    severity: ActivitySeverity.HIGH,
  })
  async updateQuota(@Req() req: any, @Body() _body: UpdateQuotaDto) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('Thiếu thông tin userId trong JWT token');

    const now = new Date();
    return {
      success: true,
      data: {
        updated: true,
        message: 'Tính năng cập nhật quota đã bị vô hiệu hóa',
      },
      message: 'Cập nhật quota thành công',
      timestamp: now.toISOString(),
      timestamp_local: timeUtils.toTimezoneIsoString(now),
    };
  }

  @Get('current')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @ApiOkResponse({ type: ApiResponseCurrentPlanDto })
  async getCurrentPlan(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('Thiếu thông tin userId trong JWT token');

    try {
      // Lấy subscription active của user
      let subscription = await this._subscriptionService.getActive(userId);

      if (!subscription) {
        // Tự động tạo free subscription nếu user chưa có
        subscription = await this._subscriptionService.createFree(userId);
      }

      if (!subscription) {
        throw new NotFoundException('Không tìm thấy gói dịch vụ hiện tại');
      }

      // SubscriptionService.getActive() returns a normalized object with `plan` (singular)
      // older code expected `plans` (plural). Support both shapes here for backward
      // compatibility: prefer `plans`, then `plan`, then fallback to `plan_code`.
      const planRef: any =
        subscription.plans ??
        subscription.plan ??
        (subscription.plan_code ? { code: subscription.plan_code } : null);

      if (!planRef || !planRef.code) {
        throw new NotFoundException('Không tìm thấy thông tin gói dịch vụ');
      }

      const plan = await this._adminPlansService.getPlanWithCurrentVersion(planRef.code);

      if (!plan) {
        throw new NotFoundException('Không tìm thấy thông tin gói dịch vụ');
      }

      // Convert BigInt values to strings to avoid serialization errors
      const convertBigIntToString = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'bigint') return obj.toString();
        if (obj instanceof Date) return obj.toISOString();
        if (Array.isArray(obj)) return obj.map(convertBigIntToString);
        if (typeof obj === 'object') {
          const converted = { ...obj };
          for (const key in converted) {
            if (Object.prototype.hasOwnProperty.call(converted, key)) {
              converted[key] = convertBigIntToString(converted[key]);
            }
          }
          return converted;
        }
        return obj;
      };

      const responseData = {
        success: true,
        data: convertBigIntToString({
          ...plan,
          subscription: {
            subscription_id: subscription.subscription_id,
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            started_at: subscription.started_at,
            billing_period: subscription.billing_period,
            auto_renew: subscription.auto_renew,
            last_payment_at: subscription.last_payment_at,
            // Add payment status indicators
            has_paid: subscription.last_payment_at !== null,
            is_trial: subscription.status === 'trialing',
            is_active: ['active', 'trialing', 'paused'].includes(subscription.status),
            payment_status: subscription.last_payment_at ? 'paid' : 'unpaid',
          },
        }),
        message: 'Lấy thông tin gói dịch vụ hiện tại thành công',
        timestamp: new Date().toISOString(),
        timestamp_local: timeUtils.toTimezoneIsoString(new Date()),
      };

      // Additional safety conversion
      return JSON.parse(
        JSON.stringify(responseData, (_, value) =>
          typeof value === 'bigint' ? value.toString() : value,
        ),
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      Logger.error('Plan controller error', String(error), 'PlanController');
      Logger.error(
        'Error stack',
        error instanceof Error ? String(error.stack) : 'No stack trace',
        'PlanController',
      );
      throw new BadRequestException(`Lấy thông tin gói dịch vụ hiện tại thất bại: ${errorMessage}`);
    }
  }

  @Get('test-license')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  async testLicense(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    const subscription = await this._subscriptionService.getActive(userId);

    return {
      success: true,
      message: 'License check successful',
      data: {
        user_id: userId,
        has_subscription: !!subscription,
        subscription_status: subscription?.status,
        plan_name: subscription?.plans?.name,
        camera_quota: subscription?.plans?.camera_quota,
        sites: subscription?.plans?.sites,
      },
    };
  }
}
