import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UpgradeResponseDto } from '../../../application/dto/upgrade/upgrade-response.dto';
import { UpgradeSubscriptionDto } from '../../../application/dto/upgrade/upgrade-subscription.dto';
import { QuotaService } from '../../../application/services/admin';
import { SubscriptionService } from '../../../application/services/subscription';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';
import { AuthenticatedRequest } from '../../../shared/types/auth.types';

@ApiBearerAuth()
@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly quotaService: QuotaService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Lấy danh sách subscriptions (Admin only)' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Số trang (1-based)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Số mục trên mỗi trang',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['trialing', 'active', 'past_due', 'grace', 'suspended', 'canceled'],
    description: 'Trạng thái subscription (ví dụ: active, canceled, ...)',
  })
  @ApiQuery({
    name: 'planCode',
    required: false,
    type: String,
    description: 'Mã gói (plan code) để lọc',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'UUID của user để lọc subscriptions',
  })
  @ApiResponse({ status: 200, description: 'Danh sách subscriptions.' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('planCode') planCode?: string,
    @Query('userId') userId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const where: any = {};
    if (status) where.status = status;
    if (planCode) where.plan_code = planCode;
    if (userId) where.user_id = userId;

    try {
      const result = await this.subscriptionService.getAllSubscriptions({
        page: pageNum,
        limit: limitNum,
        where,
      });
      return {
        success: true,
        data: result.data,
        pagination: result.meta,
        message: 'Lấy danh sách subscriptions thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger?.error('getAllSubscriptions error', error);
      throw new HttpException(
        'Lấy danh sách subscriptions thất bại',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('admin/subscriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: Lấy danh sách subscriptions với advanced filtering' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Số trang (1-based)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: 'Số mục trên mỗi trang',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['trialing', 'active', 'past_due', 'grace', 'suspended', 'canceled'],
    description: 'Trạng thái subscription để lọc',
  })
  @ApiQuery({
    name: 'planCode',
    required: false,
    type: String,
    description: 'Mã gói (plan code) để lọc',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'UUID của user để lọc subscriptions',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Tìm kiếm theo email hoặc tên người dùng',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    example: '2025-01-01',
    description: 'Ngày bắt đầu (YYYY-MM-DD) để lọc',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    example: '2025-12-31',
    description: 'Ngày kết thúc (YYYY-MM-DD) để lọc',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['created_at', 'updated_at', 'current_period_end', 'amount'],
    example: 'created_at',
    description: 'Trường để sắp xếp kết quả',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
    description: 'Thứ tự sắp xếp (asc hoặc desc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách subscriptions với advanced filtering',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              user_id: { type: 'string' },
              plan_code: { type: 'string' },
              status: { type: 'string' },
              current_period_start: { type: 'string', format: 'date-time' },
              current_period_end: { type: 'string', format: 'date-time' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
              user: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  name: { type: 'string' },
                },
              },
              plan: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                },
              },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  async getAdminSubscriptions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('planCode') planCode?: string,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const where: any = {};
    if (status) where.status = status;
    if (planCode) where.plan_code = planCode;
    if (userId) where.user_id = userId;

    // Date range filtering
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(startDate);
      if (endDate) where.created_at.lte = new Date(endDate);
    }

    const options: any = {
      page: pageNum,
      limit: limitNum,
      where,
      include: ['user', 'plans'],
    };

    // Sorting
    if (sortBy) {
      options.orderBy = {
        [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc',
      };
    }

    const result = await this.subscriptionService.getAllSubscriptions(options);

    // Filter by search term if provided
    let filteredData = result.data;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = result.data.filter((subscription: any) => {
        const userEmail = subscription.user?.email?.toLowerCase() || '';
        const userName = subscription.user?.name?.toLowerCase() || '';
        return userEmail.includes(searchLower) || userName.includes(searchLower);
      });
    }

    return {
      success: true,
      data: filteredData,
      pagination: result.meta,
      message: 'Lọc subscriptions thành công',
      timestamp: new Date(),
    };
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'caregiver')
  @ApiOperation({ summary: 'Lấy subscription hiện tại của user' })
  @ApiResponse({ status: 200, description: 'Thông tin subscription hiện tại.' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy subscription' })
  async getMySubscription(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) throw new HttpException('Chưa xác thực', HttpStatus.UNAUTHORIZED);

    const subscription = await this.subscriptionService.getActive(userId);
    if (!subscription) {
      throw new HttpException('Không tìm thấy subscription', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      data: {
        subscription,
      },
      message: 'Lấy subscription hiện tại thành công',
      timestamp: new Date(),
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'caregiver')
  @ApiOperation({ summary: 'Lấy danh sách subscriptions của user hiện tại' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách subscriptions của user',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            subscriptions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  subscription_id: { type: 'string' },
                  user_id: { type: 'string' },
                  status: {
                    type: 'string',
                    enum: ['trialing', 'active', 'past_due', 'grace', 'suspended', 'canceled'],
                  },
                  started_at: { type: 'string', format: 'date-time' },
                  current_period_start: { type: 'string', format: 'date-time' },
                  current_period_end: { type: 'string', format: 'date-time' },
                  plans: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      code: { type: 'string' },
                      name: { type: 'string' },
                      price: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
        message: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  async getMySubscriptions(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) throw new HttpException('Chưa xác thực', HttpStatus.UNAUTHORIZED);

    // Try to get active subscription
    let subscription = await this.subscriptionService.getActive(userId);

    // If no active subscription, create free one
    if (!subscription) {
      subscription = await this.subscriptionService.createFree(userId);
    }

    return {
      success: true,
      data: {
        subscriptions: subscription ? [subscription] : [],
      },
      message: 'Lấy subscriptions thành công',
      timestamp: new Date(),
    };
  }

  @Get('me/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'caregiver')
  @ApiOperation({ summary: 'Lấy enhanced subscription status với quota info' })
  @ApiResponse({
    status: 200,
    description: 'Enhanced subscription status with quota information',
    schema: {
      type: 'object',
      properties: {
        subscription: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: {
              type: 'string',
              enum: ['trialing', 'active', 'past_due', 'grace', 'suspended', 'canceled'],
            },
            plan_code: { type: 'string' },
            current_period_start: { type: 'string', format: 'date-time' },
            current_period_end: { type: 'string', format: 'date-time' },
            last_payment_at: { type: 'string', format: 'date-time' },
          },
        },
        quota: {
          type: 'object',
          properties: {
            cameras: {
              type: 'object',
              properties: {
                quota: { type: 'number' },
                used: { type: 'number' },
                allowed: { type: 'boolean' },
              },
            },
            caregivers: {
              type: 'object',
              properties: {
                quota: { type: 'number' },
                used: { type: 'number' },
                allowed: { type: 'boolean' },
              },
            },
            storage: {
              type: 'object',
              properties: {
                quota: { type: 'number' },
                used: { type: 'number' },
                exceeded: { type: 'boolean' },
              },
            },
          },
        },
        nextBilling: { type: 'string', format: 'date-time' },
        gracePeriodRemaining: { type: 'number' },
        warnings: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy subscription' })
  async getMySubscriptionStatus(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) throw new HttpException('Chưa xác thực', HttpStatus.UNAUTHORIZED);

    const subscription = await this.subscriptionService.getActive(userId);
    if (!subscription) {
      throw new HttpException('Không tìm thấy subscription', HttpStatus.NOT_FOUND);
    }

    // Get quota status
    const quotaStatus = await this.quotaService.getQuotaStatus(userId);

    // Calculate grace period remaining if applicable
    let gracePeriodRemaining: number | undefined;
    if (subscription.status === 'grace') {
      const graceStart = subscription.last_payment_at || subscription.started_at;
      const daysSinceExceeded = Math.floor(
        (Date.now() - graceStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      gracePeriodRemaining = Math.max(0, 30 - daysSinceExceeded); // 30 days grace period
    }

    // Check for warnings
    const warnings: string[] = [];
    const softCapChecks = await Promise.all([
      this.quotaService.checkSoftCap(userId, 'camera'),
      this.quotaService.checkSoftCap(userId, 'caregiver'),
      this.quotaService.checkSoftCap(userId, 'storage'),
    ]);

    softCapChecks.forEach((check, _index) => {
      if (check.warning) {
        warnings.push(check.message!);
      }
    });

    return {
      success: true,
      data: {
        subscription: {
          id: subscription.subscription_id,
          status: subscription.status,
          plan_code: subscription.plan_code,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          last_payment_at: subscription.last_payment_at,
        },
        quota: quotaStatus,
        nextBilling: subscription.current_period_end,
        gracePeriodRemaining,
        warnings,
      },
      message: 'Lấy trạng thái subscription thành công',
      timestamp: new Date(),
    };
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'caregiver')
  @ApiOperation({ summary: 'Lấy lịch sử subscription của user' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Lịch sử subscription.' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  async getMySubscriptionHistory(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new HttpException('Chưa xác thực', HttpStatus.UNAUTHORIZED);

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const result = await this.subscriptionService.getUserSubscriptions(userId);

    // Manual pagination for user subscriptions
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedData = result.slice(startIndex, endIndex);

    return {
      success: true,
      data: {
        items: paginatedData,
        total: result.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(result.length / limitNum),
      },
      message: 'Lấy lịch sử subscription thành công',
      timestamp: new Date(),
    };
  }

  @ApiOperation({ summary: 'Tạo subscription gói miễn phí' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'admin')
  @ApiBody({
    schema: {
      properties: {
        planCode: {
          type: 'string',
          example: 'basic_free',
          description:
            "Mã gói được chọn. Endpoint này chỉ cho phép tạo các gói miễn phí (ví dụ: 'basic_free').",
        },
        userId: {
          type: 'string',
          example: 'user_id_here',
          description:
            'Tùy chọn: UUID của user để tạo subscription cho user đó. Nếu bỏ trống, server sẽ sử dụng user đang xác thực từ token.',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Tạo thành công subscription miễn phí.' })
  @ApiResponse({ status: 400, description: 'Chỉ hỗ trợ gói miễn phí tại endpoint này' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @Post()
  @LogActivity({
    action: 'create_free_subscription',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo subscription gói miễn phí',
    resource_type: 'subscription',
    resource_id: 'userId',
    severity: ActivitySeverity.MEDIUM,
  })
  async createFree(
    @Req() req: any,
    @Body('planCode') planCode: string,
    @Body('userId') userId: string,
  ) {
    const userIdFromToken = req.user?.userId;
    if (!userIdFromToken && !userId) {
      throw new HttpException('Thiếu userId', HttpStatus.UNAUTHORIZED);
    }

    const finalUserId = userIdFromToken || userId;
    const allow = ['basic', 'basic_free'];
    if (!allow.includes((planCode || '').toLowerCase())) {
      throw new HttpException('Chỉ hỗ trợ gói miễn phí tại endpoint này', HttpStatus.BAD_REQUEST);
    }
    try {
      const result = await this.subscriptionService.createFree(finalUserId);
      return {
        success: true,
        data: result,
        message: 'Tạo subscription miễn phí thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger?.error('createFree error', error);
      throw new HttpException(
        'Tạo subscription miễn phí thất bại',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Tạm dừng subscription' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'caregiver', 'admin')
  @ApiResponse({ status: 200, description: 'Đã tạm dừng subscription.' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @Post(':id/pause')
  @LogActivity({
    action: 'pause_subscription',
    action_enum: ActivityAction.UPDATE,
    message: 'Tạm dừng subscription',
    resource_type: 'subscription',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async pause(@Req() req: any, @Param('id') id: string, @Body('reason') reason?: string) {
    const userId = req.user?.userId;
    if (!userId) throw new HttpException('Chưa xác thực', HttpStatus.UNAUTHORIZED);
    try {
      const result = await this.subscriptionService.pause(userId, reason);
      return {
        success: true,
        data: result,
        message: 'Tạm dừng subscription thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger?.error('pause error', error);
      throw new HttpException('Tạm dừng subscription thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Tiếp tục subscription' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'caregiver', 'admin')
  @ApiResponse({ status: 200, description: 'Đã tiếp tục subscription.' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @Post(':id/resume')
  @LogActivity({
    action: 'resume_subscription',
    action_enum: ActivityAction.UPDATE,
    message: 'Tiếp tục subscription',
    resource_type: 'subscription',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async resume(@Req() req: any, @Param('id') _id: string) {
    const userId = req.user?.userId;
    if (!userId) throw new HttpException('Chưa xác thực', HttpStatus.UNAUTHORIZED);
    try {
      const result = await this.subscriptionService.resume(userId);
      return {
        success: true,
        data: result,
        message: 'Tiếp tục subscription thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger?.error('resume error', error);
      throw new HttpException('Tiếp tục subscription thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Huỷ subscription' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'caregiver', 'admin')
  @ApiResponse({ status: 200, description: 'Đã huỷ subscription.' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @Post(':id/cancel')
  @LogActivity({
    action: 'cancel_subscription',
    action_enum: ActivityAction.DELETE,
    message: 'Huỷ subscription',
    resource_type: 'subscription',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  async cancel(@Req() req: any, @Param('id') _id: string) {
    const userId = req.user?.userId;
    if (!userId) throw new HttpException('Chưa xác thực', HttpStatus.UNAUTHORIZED);
    try {
      const result = await this.subscriptionService.cancel(userId);
      return {
        success: true,
        data: result,
        message: 'Huỷ subscription thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger?.error('cancel error', error);
      throw new HttpException('Huỷ subscription thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Huỷ subscription (luôn cuối kỳ, chuyển về Basic, không hoàn tiền)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'caregiver', 'admin')
  @ApiBody({
    schema: {
      properties: {
        reason: {
          type: 'string',
          example: 'Không còn nhu cầu sử dụng',
          description: 'Lý do huỷ (tùy chọn)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Đã huỷ subscription (chuyển về Basic cuối kỳ, không hoàn tiền).',
    schema: {
      properties: {
        subscription: { type: 'object', description: 'Thông tin subscription đã cập nhật' },
        refund: { type: 'null', description: 'Luôn null - không có hoàn tiền' },
        effective_date: {
          type: 'string',
          format: 'date-time',
          description: 'Ngày huỷ có hiệu lực (cuối kỳ hiện tại)',
        },
        message: { type: 'string', description: 'Thông báo cho người dùng' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Không thể huỷ subscription' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @Post(':id/cancel-with-policy')
  @LogActivity({
    action: 'cancel_subscription_with_policy',
    action_enum: ActivityAction.DELETE,
    message: 'Huỷ subscription (cuối kỳ, chuyển về Basic, không hoàn tiền)',
    resource_type: 'subscription',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  async cancelWithPolicy(
    @Req() req: any,
    @Param('id') _id: string,
    @Body() body: { reason?: string },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new HttpException('Chưa xác thực', HttpStatus.UNAUTHORIZED);

    const { reason } = body;

    try {
      const result = await this.subscriptionService.cancelWithPolicy(userId, {
        reason,
      });
      return {
        success: true,
        data: result,
        message: 'Huỷ subscription thành công (chuyển về Basic cuối kỳ, không hoàn tiền)',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger?.error('cancelWithPolicy error', error);
      throw new HttpException(
        'Huỷ subscription với chính sách hoàn tiền thất bại',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Xác nhận thanh toán subscription' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBody({
    schema: {
      properties: {
        payment_id: { type: 'string', example: 'payment_id_or_vnp_TxnRef' },
        plan_code: { type: 'string', example: 'pro' },
      },
    },
  })
  @Post('paid')
  @LogActivity({
    action: 'confirm_subscription_paid',
    action_enum: ActivityAction.UPDATE,
    message: 'Xác nhận thanh toán subscription',
    resource_type: 'subscription',
    resource_name: 'payment',
    severity: ActivitySeverity.HIGH,
  })
  async confirmPaid(
    @Req() req: any,
    @Body('payment_id') paymentIdOrTxnRef: string,
    @Body('plan_code') planCode?: string,
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new HttpException('Chưa xác thực', HttpStatus.UNAUTHORIZED);
    const result = await this.subscriptionService.confirmPaid(userId, paymentIdOrTxnRef, planCode);
    if (!result || result.status !== 'active') {
      throw new HttpException(
        result?.message || 'Thanh toán thất bại hoặc không tìm thấy',
        HttpStatus.BAD_REQUEST,
      );
    }
    return {
      success: true,
      data: result,
      message: 'Xác nhận thanh toán subscription thành công',
      timestamp: new Date(),
    };
  }

  @Post(':id/upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Nâng cấp subscription (tính toán phần chênh lệch)' })
  @ApiBody({ type: UpgradeSubscriptionDto })
  @ApiResponse({ status: 200, description: 'Đã nâng cấp subscription.', type: UpgradeResponseDto })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @LogActivity({
    action: 'upgrade_subscription',
    action_enum: ActivityAction.UPDATE,
    message: 'Nâng cấp subscription',
    resource_type: 'subscription',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async upgrade(
    @Req() req: any,
    @Param('id') subscriptionId: string,
    @Body() dto: UpgradeSubscriptionDto,
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new HttpException('Chưa xác thực', HttpStatus.UNAUTHORIZED);
    const result = await this.subscriptionService.upgrade({
      ...dto,
      userId,
      subscriptionId,
      idempotencyKey: req.headers['idempotency-key'],
    });
    return {
      success: true,
      data: {
        ...result,
        isProration: result.isProration,
        prorationCharge: result.prorationCharge,
        prorationCredit: result.prorationCredit,
      },
      message: 'Nâng cấp subscription thành công',
      timestamp: new Date(),
    };
  }

  // ========== SUBSCRIPTION ANALYTICS APIs ==========

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Thống kê subscription tổng quan' })
  @ApiQuery({ name: 'period', required: false, example: 'month' })
  @ApiResponse({ status: 200, description: 'Thống kê subscription.' })
  async getSubscriptionStats(@Query('period') period?: string) {
    try {
      const result = await this.subscriptionService.getSubscriptionStats({
        period: period || 'month',
      });
      return {
        success: true,
        data: result,
        message: 'Thống kê subscription thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger?.error('getSubscriptionStats error', error);
      throw new HttpException('Thống kê subscription thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('churn')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Phân tích churn rate' })
  @ApiQuery({ name: 'period', required: false, example: 'month' })
  @ApiResponse({ status: 200, description: 'Phân tích churn rate.' })
  async getChurnAnalysis(@Query('period') period?: string) {
    try {
      const result = await this.subscriptionService.getChurnAnalysis({
        period: period || 'month',
      });
      return {
        success: true,
        data: result,
        message: 'Phân tích churn rate thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger?.error('getChurnAnalysis error', error);
      throw new HttpException('Phân tích churn rate thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ========== SUBSCRIPTION LIFECYCLE APIs ==========

  @Get('expiring')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Danh sách subscription sắp hết hạn' })
  @ApiQuery({ name: 'days', required: false, example: 7 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Danh sách subscription sắp hết hạn.' })
  async getExpiringSubscriptions(
    @Query('days') days?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    try {
      const result = await this.subscriptionService.getExpiringSubscriptions({
        days: days || 7,
        page: page || 1,
        limit: limit || 20,
      });
      return {
        success: true,
        data: result,
        message: 'Lấy danh sách subscription sắp hết hạn thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger?.error('getExpiringSubscriptions error', error);
      throw new HttpException(
        'Lấy danh sách subscription sắp hết hạn thất bại',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/reactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Reactivate subscription đã hủy' })
  @ApiBody({
    schema: {
      properties: {
        reason: { type: 'string', example: 'customer_request' },
        notes: { type: 'string', example: 'Reactivate theo yêu cầu khách hàng' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Subscription đã được reactivate.' })
  @LogActivity({
    action: 'reactivate_subscription',
    action_enum: ActivityAction.UPDATE,
    message: 'Reactivate subscription',
    resource_type: 'subscription',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async reactivateSubscription(
    @Param('id') id: string,
    @Body() body: { reason?: string; notes?: string },
  ) {
    try {
      const result = await this.subscriptionService.reactivateSubscription(id, body);
      return {
        success: true,
        data: result,
        message: 'Reactivate subscription thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger?.error('reactivateSubscription error', error);
      throw new HttpException('Reactivate subscription thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id/plan')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Thay đổi plan subscription (không tính proration)' })
  @ApiBody({
    schema: {
      properties: {
        plan_code: { type: 'string', example: 'pro' },
        reason: { type: 'string', example: 'admin_change' },
        notes: { type: 'string', example: 'Thay đổi plan theo yêu cầu admin' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Plan đã được thay đổi.' })
  @LogActivity({
    action: 'change_subscription_plan',
    action_enum: ActivityAction.UPDATE,
    message: 'Thay đổi plan subscription',
    resource_type: 'subscription',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async changePlan(
    @Param('id') id: string,
    @Body() body: { plan_code: string; reason?: string; notes?: string },
  ) {
    try {
      const result = await this.subscriptionService.changePlan(id, body);
      return {
        success: true,
        data: result,
        message: 'Thay đổi plan subscription thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger?.error('changePlan error', error);
      throw new HttpException(
        'Thay đổi plan subscription thất bại',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('lifecycle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Lịch sử lifecycle của subscriptions' })
  @ApiQuery({ name: 'subscription_id', required: false })
  @ApiQuery({ name: 'event_type', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Lịch sử lifecycle events.' })
  async getLifecycleEvents(
    @Query('subscription_id') subscriptionId?: string,
    @Query('event_type') eventType?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    try {
      const result = await this.subscriptionService.getLifecycleEvents({
        subscription_id: subscriptionId,
        event_type: eventType,
        page: page || 1,
        limit: limit || 20,
      });
      return {
        success: true,
        data: result,
        message: 'Lấy lịch sử lifecycle thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger?.error('getLifecycleEvents error', error);
      throw new HttpException('Lấy lịch sử lifecycle thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ========== BULK OPERATIONS APIs ==========

  @Post('bulk-action')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Thực hiện bulk operations trên subscriptions' })
  @ApiBody({
    schema: {
      properties: {
        action: { type: 'string', example: 'pause', enum: ['pause', 'resume', 'cancel'] },
        subscription_ids: { type: 'array', items: { type: 'string' }, example: ['sub_1', 'sub_2'] },
        reason: { type: 'string', example: 'maintenance' },
        notes: { type: 'string', example: 'Bulk operation for maintenance' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Bulk operation completed.' })
  @LogActivity({
    action: 'bulk_subscription_action',
    action_enum: ActivityAction.UPDATE,
    message: 'Bulk operation trên subscriptions',
    resource_type: 'subscription',
    severity: ActivitySeverity.HIGH,
  })
  async bulkAction(
    @Body()
    body: {
      action: 'pause' | 'resume' | 'cancel';
      subscription_ids: string[];
      reason?: string;
      notes?: string;
    },
  ) {
    try {
      const result = await this.subscriptionService.bulkAction(body);
      return {
        success: true,
        data: result,
        message: 'Bulk action trên subscriptions thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger?.error('bulkAction error', error);
      throw new HttpException(
        'Bulk action trên subscriptions thất bại',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ========== MANUAL REFUND (ADMIN ONLY) ==========

  @Post('admin/manual-refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: Tạo refund thủ công (cho case đặc biệt)' })
  @ApiBody({
    schema: {
      properties: {
        user_id: { type: 'string', description: 'User ID cần refund' },
        amount: { type: 'number', description: 'Số tiền refund (VND)' },
        reason: { type: 'string', description: 'Lý do refund' },
        notes: { type: 'string', description: 'Ghi chú chi tiết' },
        transaction_id: { type: 'string', description: 'Transaction ID gốc (optional)' },
      },
      required: ['user_id', 'amount', 'reason'],
    },
  })
  @ApiResponse({ status: 200, description: 'Refund thủ công thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền admin' })
  @LogActivity({
    action: 'manual_refund',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo refund thủ công',
    resource_type: 'transaction',
    severity: ActivitySeverity.CRITICAL,
  })
  async createManualRefund(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      user_id: string;
      amount: number;
      reason: string;
      notes?: string;
      transaction_id?: string;
    },
  ) {
    // Validate admin
    if (!req.user?.role?.includes('admin')) {
      throw new HttpException('Chỉ admin mới có quyền thực hiện', HttpStatus.FORBIDDEN);
    }

    const { user_id, amount, reason, notes, transaction_id } = body;

    if (!user_id || !amount || amount <= 0) {
      throw new HttpException('Dữ liệu không hợp lệ', HttpStatus.BAD_REQUEST);
    }

    // Tạo manual refund transaction
    const refundTx = await this.subscriptionService.createManualRefund({
      userId: user_id,
      amount,
      reason,
      notes,
      originalTransactionId: transaction_id,
      adminUserId: getUserIdFromReq(req),
    });

    return {
      success: true,
      data: {
        refund_transaction_id: refundTx.tx_id,
        amount: refundTx.amount_total,
        status: refundTx.status,
      },
      message: 'Refund thủ công đã được tạo',
      timestamp: new Date(),
    };
  }
}
