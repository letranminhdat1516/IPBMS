import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CreatePaymentDto, ManualPaymentDto } from '../../../application/dto/payment/payment.dto';
import { PaymentService } from '../../../application/services/payments';
import { buildVnpSignedQuery } from '../../../shared/utils/vnpay-sign.util';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { Public } from '../../../shared/decorators/public.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { PaymentsSwagger } from '../../../swagger/payments.swagger';
import { timeUtils } from '../../../shared/constants/time.constants';

type JwtUser = { userId?: string; sub?: string; role?: string };

@ApiTags('payments')
@ApiBearerAuth()
@Roles('admin', 'caregiver', 'customer')
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly _service: PaymentService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('vnpay')
  @PaymentsSwagger.create
  @LogActivity({
    action: 'create_payment',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo giao dịch VNPay mới',
    resource_type: 'payment',
    resource_name: 'payment',
    resource_id: 'user_id',
    severity: ActivitySeverity.HIGH,
  })
  create(
    @Body() dto: CreatePaymentDto,
    @Headers('x-forwarded-for') xff: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() req: Request & { user?: JwtUser },
  ) {
    let userId = req.user?.userId ?? req.user?.sub;
    if (!userId && req.user?.role === 'admin') {
      userId = dto.user_id;
    }
    if (!userId) throw new UnauthorizedException('Người dùng chưa xác thực');
    dto.user_id = userId;
    const rawIp =
      xff?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      (req.socket?.remoteAddress ?? '127.0.0.1');
    const clientIp = String(rawIp).includes(':') ? '127.0.0.1' : rawIp;
    return this._service.createVnpayPayment(dto, clientIp, idempotencyKey?.trim());
  }

  @Public()
  @Get('return')
  async handleReturnGet(@Req() req: Request) {
    try {
      const result = await this._service.handleReturn(req.query as Record<string, any>);
      const now = new Date();
      return {
        success: true,
        data: result,
        message: 'Xử lý VNPay return callback thành công',
        timestamp: now.toISOString(),
        timestamp_local: timeUtils.toTimezoneIsoString(now),
      };
    } catch (error) {
      this.logger.error('handleReturnGet error', error);
      // If service threw a known HttpException (e.g. BadRequest, NotFound), rethrow it
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Xử lý VNPay return callback thất bại',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // VNPay may call the return endpoint with POST in some flows (or when using form POST).
  // Add POST handler so the server won't return 404 when VNPay POSTs to /payments/return
  @Public()
  @Post('return')
  async handleReturnPost(@Body() body: Record<string, any>) {
    try {
      // Normalize body.rawQuery if present (from mobile app)
      const normalized = body?.rawQuery
        ? Object.fromEntries(new URLSearchParams(String(body.rawQuery)))
        : body;

      const result = await this._service.handleReturn(normalized);
      const now = new Date();
      return {
        success: true,
        data: result,
        message: 'Xử lý VNPay return callback thành công',
        timestamp: now.toISOString(),
        timestamp_local: timeUtils.toTimezoneIsoString(now),
      };
    } catch (error) {
      this.logger.error('handleReturnPost error', error);
      // Don't wrap HttpExceptions (e.g. BadRequest) into 500
      if (
        error instanceof HttpException ||
        (error && typeof (error as any).getStatus === 'function')
      ) {
        throw error as HttpException;
      }
      throw new HttpException(
        'Xử lý VNPay return callback thất bại',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Post('ipn')
  @PaymentsSwagger.ipn
  @LogActivity({
    action: 'handle_payment_ipn',
    action_enum: ActivityAction.UPDATE,
    message: 'Xử lý VNPay IPN callback',
    resource_type: 'payment',
    resource_name: 'payment',
    resource_id: 'transaction',
    severity: ActivitySeverity.MEDIUM,
  })
  async handleIpnPost(@Body() body: Record<string, any>) {
    try {
      const result = await this._service.handleIpn(body);
      const now = new Date();
      return {
        success: true,
        data: result,
        message: 'Xử lý VNPay IPN callback thành công',
        timestamp: now.toISOString(),
        timestamp_local: timeUtils.toTimezoneIsoString(now),
      };
    } catch (error) {
      this.logger.error('handleIpnPost error', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Xử lý VNPay IPN callback thất bại',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('querydr/:ref')
  @Roles('admin', 'caregiver', 'customer')
  @LogActivity({
    action: 'query_payment_status',
    action_enum: ActivityAction.CREATE,
    message: 'Truy vấn trạng thái thanh toán VNPay',
    resource_type: 'payment',
    resource_name: 'payment',
    resource_id: 'ref',
    severity: ActivitySeverity.LOW,
  })
  async queryPaymentStatus(@Param('ref') ref: string, @Req() req: Request) {
    const clientIp = req.ip || '127.0.0.1';
    const result = await this._service.queryDr(ref, clientIp);

    // Handle different response types
    if ((result as any).httpStatus && (result as any).httpStatus !== 200) {
      throw new HttpException(result, (result as any).httpStatus);
    }

    const now = new Date();
    return {
      success: true,
      data: result,
      message: 'Truy vấn trạng thái thanh toán thành công',
      timestamp: now.toISOString(),
      timestamp_local: timeUtils.toTimezoneIsoString(now),
    };
  }

  // Temporary debug endpoint
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('debug/:paymentId')
  @PaymentsSwagger.debug
  @Roles('admin', 'caregiver', 'customer')
  async debugTransaction(@Param('paymentId') paymentId: string) {
    try {
      const result = await this._service.debugCheckTransaction(paymentId);
      const now = new Date();
      return {
        success: true,
        data: result,
        message: 'Debug transaction thành công',
        timestamp: now.toISOString(),
        timestamp_local: timeUtils.toTimezoneIsoString(now),
      };
    } catch (error) {
      this.logger.error('debugTransaction error', error);
      throw new HttpException('Debug transaction thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('create')
  @Roles('admin', 'caregiver', 'customer')
  @ApiOperation({ summary: 'Tạo giao dịch thanh toán' })
  @ApiResponse({ status: 200, description: 'Giao dịch đã được tạo' })
  async createPayment(@Body() body: any, @Req() req: Request) {
    // Get client IP like in the existing VNPay method
    const rawIp =
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      (req.socket?.remoteAddress ?? '127.0.0.1');
    const clientIp = String(rawIp).includes(':') ? '127.0.0.1' : rawIp;

    // For now, delegate to VNPay implementation
    // In a real implementation, this would be a generic payment creation
    try {
      // Support admin/manual creation path which should include delivery_data
      if (body && body.provider === 'manual') {
        const payment = await this._service.createManualPayment({
          user_id: body.user_id || (req as any).user?.userId || (req as any).user?.sub,
          amount: body.amount ?? 0,
          description: body.description,
          delivery_data:
            body.delivery_data ?? (body.plan_code ? { plan_code: body.plan_code } : {}),
          provider: 'manual',
        });
        const now = new Date();
        return {
          success: true,
          data: payment,
          message: 'Tạo manual payment thành công',
          timestamp: now.toISOString(),
          timestamp_local: timeUtils.toTimezoneIsoString(now),
        };
      }

      const result = await this._service.createVnpayPayment(body, clientIp);
      const now = new Date();
      return {
        success: true,
        data: result,
        message: 'Tạo giao dịch thanh toán thành công',
        timestamp: now.toISOString(),
        timestamp_local: timeUtils.toTimezoneIsoString(now),
      };
    } catch (error) {
      this.logger.error('createPayment error', error);
      throw new HttpException(
        'Tạo giao dịch thanh toán thất bại',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Admin: tạo manual payment có validate DTO, auto xử lý post-processing
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('manual')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: Tạo manual payment (đã thanh toán)' })
  @ApiResponse({ status: 201, description: 'Manual payment đã được tạo' })
  async createManual(@Body() dto: ManualPaymentDto) {
    try {
      const planCode = dto.plan_code || (dto.delivery_data as any)?.plan_code;
      if (!planCode) {
        throw new HttpException(
          'Thiếu plan_code (trực tiếp hoặc trong delivery_data.plan_code)',
          HttpStatus.BAD_REQUEST,
        );
      }

      const payment = await this._service.createManualPayment({
        user_id: dto.user_id,
        amount: dto.amount,
        description: dto.description,
        delivery_data: dto.delivery_data ?? { plan_code: planCode },
        provider: dto.provider ?? 'manual',
      });

      // Kích hoạt xử lý subscription/events ngay sau khi tạo
      try {
        await this._service.triggerPaymentSuccessProcessing(payment.payment_id);
      } catch (e) {
        this.logger.warn('[createManual] triggerPaymentSuccessProcessing warning', e as any);
      }

      const now = new Date();
      return {
        success: true,
        data: payment,
        message: 'Tạo manual payment thành công',
        timestamp: now.toISOString(),
        timestamp_local: timeUtils.toTimezoneIsoString(now),
      };
    } catch (error) {
      this.logger.error('createManual error', error);
      throw new HttpException('Tạo manual payment thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id/status')
  @Roles('admin', 'caregiver', 'customer')
  @ApiOperation({ summary: 'Lấy trạng thái thanh toán' })
  @ApiResponse({ status: 200, description: 'Trạng thái thanh toán' })
  async getPaymentStatus(@Param('id') id: string) {
    // Mock implementation - returns a simple payment status snapshot
    const now = new Date();
    return {
      success: true,
      data: {
        payment_id: id,
        status: 'pending',
        amount: null,
        currency: 'VND',
        created_at: now.toISOString(),
        created_at_local: timeUtils.toTimezoneIsoString(now),
      },
      message: 'Lấy trạng thái thanh toán thành công',
      timestamp: now.toISOString(),
      timestamp_local: timeUtils.toTimezoneIsoString(now),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/confirm')
  @Roles('admin', 'caregiver', 'customer')
  @ApiOperation({ summary: 'Xác nhận thanh toán' })
  @ApiResponse({ status: 200, description: 'Thanh toán đã được xác nhận' })
  async confirmPayment(@Param('id') id: string, @Body() _body: any) {
    // Mock implementation
    const now = new Date();
    return {
      success: true,
      data: {
        payment_id: id,
        confirmed: true,
        status: 'confirmed',
      },
      message: 'Thanh toán đã được xác nhận',
      timestamp: now.toISOString(),
      timestamp_local: timeUtils.toTimezoneIsoString(now),
    };
  }

  // Test endpoint to mark payment as paid (for testing purposes)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/test-paid')
  @Roles('admin')
  @ApiOperation({ summary: 'Test: Đánh dấu thanh toán thành công' })
  @ApiResponse({ status: 200, description: 'Thanh toán đã được đánh dấu là thành công' })
  async testMarkPaymentAsPaid(@Param('id') paymentId: string) {
    try {
      const result = await this._service.testMarkPaymentAsPaid(paymentId);
      const now = new Date();
      return {
        success: true,
        data: result,
        message: 'Đánh dấu thanh toán thành công',
        timestamp: now.toISOString(),
        timestamp_local: timeUtils.toTimezoneIsoString(now),
      };
    } catch (error) {
      this.logger.error('testMarkPaymentAsPaid error', error);
      throw new HttpException('Đánh dấu thanh toán thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Admin endpoint to re-trigger post-processing for a payment
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/reprocess')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: chạy lại xử lý payment success' })
  @ApiResponse({ status: 200, description: 'Đã kích hoạt xử lý payment success' })
  async reprocessPayment(@Param('id') paymentId: string) {
    try {
      const result = await this._service.triggerPaymentSuccessProcessing(paymentId);
      const now = new Date();
      return {
        success: true,
        data: result,
        message: 'Đã kích hoạt xử lý payment success',
        timestamp: now.toISOString(),
        timestamp_local: timeUtils.toTimezoneIsoString(now),
      };
    } catch (error) {
      this.logger.error('reprocessPayment error', error);
      throw new HttpException('Kích hoạt xử lý payment thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('debug-sign')
  @ApiOperation({ summary: 'Debug VNPay signing (admin only)' })
  @ApiResponse({ status: 200, description: 'Signing debug result' })
  debugSign(@Body() body: { params: Record<string, any>; secret?: string }) {
    const secret = body.secret || this._service.getVnpSecret(); // Assume we add getter
    const { canonical, hash, query } = buildVnpSignedQuery(body.params, secret);
    return {
      canonical,
      hash,
      query,
      secretLength: secret.length,
      trimmedSecretLength: secret.trim().length,
    };
  }
}
