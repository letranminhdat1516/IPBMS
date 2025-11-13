import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
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
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../application/dto/shared/error-response.dto';
import { Response } from 'express';
import { TransactionService } from '../../../application/services/payments';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { AuthenticatedRequest } from '../../../shared/types/auth.types';

@ApiBearerAuth()
@ApiTags('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('transactions')
export class TransactionController {
  constructor(
    private readonly _transactionService: TransactionService,
    private readonly _prisma: PrismaService,
  ) {}

  @ApiOperation({ summary: 'Danh sách tất cả giao dịch' })
  @ApiResponse({ status: 200, description: 'Danh sách giao dịch với phân trang.' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Số trang (bắt đầu từ 1). Mặc định 1.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số mục trên trang. Mặc định 20.',
  })
  @ApiQuery({
    name: 'user_id',
    required: false,
    type: String,
    description: 'Lọc theo ID người dùng.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: "Lọc theo trạng thái giao dịch (ví dụ: 'pending','paid','failed').",
  })
  @Get()
  async getAllTransactions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('user_id') user_id?: string,
    @Query('status') status?: string,
  ) {
    return await this._transactionService.list({
      page: page || 1,
      limit: limit || 20,
      user_id,
      status,
    });
  }

  @ApiOperation({ summary: 'Thống kê giao dịch' })
  @ApiResponse({ status: 200, description: 'Thống kê tổng quan giao dịch.' })
  @ApiQuery({
    name: 'period',
    required: false,
    type: String,
    description: "Khoảng thời gian để thống kê (e.g. 'day','week','month'). Mặc định 'month'.",
  })
  @ApiQuery({
    name: 'user_id',
    required: false,
    type: String,
    description: 'Nếu cung cấp, trả thống kê cho user cụ thể.',
  })
  @Get('stats')
  async getTransactionStats(@Query('period') period?: string, @Query('user_id') user_id?: string) {
    return await this._transactionService.getStats({
      period: period || 'month',
      user_id,
    });
  }

  @ApiOperation({ summary: 'Tạo giao dịch (checkout session)' })
  @ApiBody({
    schema: {
      properties: {
        subscriptionId: {
          type: 'string',
          example: 'sub_id_here',
          description: 'ID subscription nội bộ. Không bắt buộc khi tạo giao dịch lẻ (one-off).',
        },
        planCode: {
          type: 'string',
          example: 'pro',
          description: 'Mã gói (plan) đang mua hoặc nâng cấp (ví dụ: free, pro, enterprise).',
        },
        action: {
          type: 'string',
          example: 'upgrade',
          description:
            "Hành động cho giao dịch: 'create' | 'upgrade' | 'renew' | 'refund'. Dùng để xác định luồng xử lý phía server.",
        },
        periodStart: {
          type: 'string',
          format: 'date-time',
          description:
            'Ngày bắt đầu kỳ đăng ký (ISO 8601). Không bắt buộc cho giao dịch không thuộc subscription.',
        },
        periodEnd: {
          type: 'string',
          format: 'date-time',
          description:
            'Ngày kết thúc kỳ đăng ký (ISO 8601). Không bắt buộc cho giao dịch không thuộc subscription.',
        },
        currency: {
          type: 'string',
          example: 'VND',
          description: 'Mã tiền tệ (ISO 4217), ví dụ: VND, USD.',
        },
        amountTotal: {
          type: 'number',
          example: 99000,
          description: 'Tổng số tiền (đơn vị nhỏ nhất, ví dụ: đồng hoặc cents tuỳ provider).',
        },
        provider: {
          type: 'string',
          example: 'stripe',
          description:
            'Nhà cung cấp thanh toán (stripe | vnpay | ...). Bỏ qua để dùng provider mặc định.',
        },
        providerPaymentId: {
          type: 'string',
          example: 'pi_123',
          description:
            'ID thanh toán theo provider (dùng khi đồng bộ hoặc báo cáo giao dịch từ bên ngoài).',
        },
        idempotencyKey: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440000',
          description:
            'Khóa idempotency do client cung cấp để tránh xử lý trùng lặp khi retry. ' +
            'Khuyến nghị: dùng UUID v4 (ví dụ như trên) và sinh một key mới cho mỗi thao tác tạo giao dịch độc lập. ' +
            'Server có thể lưu mapping { key -> kết quả } với TTL để trả lại kết quả trước đó khi nhận cùng key; do đó cùng một key sẽ không gây tạo giao dịch trùng. ' +
            'Bạn có thể gửi key trong body (trường này) hoặc header `Idempotency-Key` (hoặc `X-Idempotency-Key`). Không đưa dữ liệu nhạy cảm vào key.',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Tạo giao dịch thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Khóa idempotency để tránh xử lý trùng khi client retry. Có thể gửi trong header `Idempotency-Key` hoặc trường body `idempotencyKey`. Khuyến nghị dùng UUID v4.',
  })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    required: false,
    description:
      'Khóa idempotency (alternate header name). Hỗ trợ để tương thích với clients gửi `X-Idempotency-Key`.',
  })
  @Post()
  @LogActivity({
    action: 'create_transaction',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo giao dịch mới',
    resource_type: 'transaction',
    resource_name: 'transaction',
    severity: ActivitySeverity.MEDIUM,
  })
  async createTransaction(@Body() body: unknown) {
    const tx = await this._transactionService.create(body);
    return tx;
  }

  @ApiOperation({ summary: 'Danh sách giao dịch theo subscription' })
  @ApiResponse({ status: 200, description: 'Danh sách giao dịch.' })
  @Get('subscription/:subscriptionId')
  async listBySubscription(@Param('subscriptionId') subscriptionId: string) {
    return await this._transactionService.listBySubscription(subscriptionId);
  }

  @ApiOperation({ summary: 'Chi tiết giao dịch theo ID' })
  @ApiResponse({ status: 200, description: 'Thông tin chi tiết giao dịch.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @Roles('admin', 'customer')
  @Get(':id')
  async getTransaction(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const tx = await this._transactionService.findById(id);
    if (!tx) throw new HttpException('Not found', HttpStatus.NOT_FOUND);

    // Check ownership: admin can see all, customers can only see their own transactions
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    if (userRole !== 'admin') {
      // For non-admin users, check if they own this transaction via subscription
      const txWithSubs = tx as any; // Cast to access subscriptions relation
      if (!txWithSubs.subscriptions || txWithSubs.subscriptions.user_id !== userId) {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }
    }

    return tx;
  }

  // ========== REFUND APIs ==========
  @ApiOperation({ summary: 'Kiểm tra khả năng refund giao dịch' })
  @ApiResponse({ status: 200, description: 'Thông tin refund khả thi.' })
  @ApiQuery({
    name: 'id',
    required: true,
    type: String,
    description: 'ID của giao dịch cần kiểm tra khả năng refund.',
  })
  @Get(':id/refund')
  async checkRefund(@Param('id') id: string) {
    return await this._transactionService.checkRefundEligibility(id);
  }

  @ApiOperation({ summary: 'Xử lý refund giao dịch' })
  @ApiBody({
    schema: {
      properties: {
        amount: {
          type: 'number',
          example: 50000,
          description:
            'Số tiền muốn refund (đơn vị như khi tạo giao dịch). Nếu không cung cấp, mặc định refund toàn bộ.',
        },
        reason: {
          type: 'string',
          example: 'customer_request',
          description:
            'Lý do refund (mã/chuỗi để ghi log, ví dụ: customer_request, payment_error).',
        },
        notes: {
          type: 'string',
          example: 'Refund theo yêu cầu khách hàng',
          description: 'Ghi chú bổ sung cho hành động refund.',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Refund thành công.' })
  @ApiResponse({ status: 400, description: 'Không thể refund' })
  @Post(':id/refund')
  @LogActivity({
    action: 'refund_transaction',
    action_enum: ActivityAction.UPDATE,
    message: 'Refund giao dịch',
    resource_type: 'transaction',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  async processRefund(
    @Param('id') id: string,
    @Body() body: { amount?: number; reason?: string; notes?: string },
  ) {
    return await this._transactionService.processRefund(id, body);
  }

  // ========== FAILED TRANSACTIONS APIs ==========

  @ApiOperation({ summary: 'Danh sách giao dịch thất bại' })
  @ApiResponse({ status: 200, description: 'Danh sách giao dịch thất bại.' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Số trang (mặc định 1).' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số mục trên trang (mặc định 20).',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Số ngày gần nhất để lọc giao dịch thất bại (mặc định 30).',
  })
  @Get('failed')
  async getFailedTransactions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('days') days?: number,
  ) {
    return await this._transactionService.getFailedTransactions({
      page: page || 1,
      limit: limit || 20,
      days: days || 30,
    });
  }

  @ApiOperation({ summary: 'Retry giao dịch thất bại' })
  @ApiResponse({ status: 200, description: 'Retry thành công.' })
  @ApiResponse({ status: 400, description: 'Không thể retry' })
  @Post(':id/retry')
  @LogActivity({
    action: 'retry_transaction',
    action_enum: ActivityAction.UPDATE,
    message: 'Retry giao dịch thất bại',
    resource_type: 'transaction',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async retryTransaction(@Param('id') id: string) {
    return await this._transactionService.retryTransaction(id);
  }

  // ========== REVENUE ANALYTICS APIs ==========

  @ApiOperation({ summary: 'Phân tích doanh thu' })
  @ApiResponse({ status: 200, description: 'Dữ liệu phân tích doanh thu.' })
  @ApiQuery({
    name: 'period',
    required: false,
    type: String,
    description: "Khoảng thời gian (e.g. 'day','week','month'). Mặc định 'month'.",
  })
  @ApiQuery({
    name: 'start_date',
    required: false,
    type: String,
    description: 'Ngày bắt đầu (ISO 8601).',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    type: String,
    description: 'Ngày kết thúc (ISO 8601).',
  })
  @ApiQuery({
    name: 'group_by',
    required: false,
    type: String,
    description: "Nhóm theo trường (e.g. 'day','week','month'). Mặc định 'day'.",
  })
  @Get('revenue')
  async getRevenueAnalytics(
    @Query('period') period?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('group_by') groupBy?: string,
  ) {
    return await this._transactionService.getRevenueAnalytics({
      period: period || 'month',
      startDate,
      endDate,
      groupBy: groupBy || 'day',
    });
  }

  @ApiOperation({ summary: 'Báo cáo doanh thu chi tiết' })
  @ApiResponse({ status: 200, description: 'Báo cáo doanh thu chi tiết.' })
  @ApiQuery({
    name: 'start_date',
    required: true,
    type: String,
    description: 'Ngày bắt đầu báo cáo (ISO 8601).',
  })
  @ApiQuery({
    name: 'end_date',
    required: true,
    type: String,
    description: 'Ngày kết thúc báo cáo (ISO 8601).',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    type: String,
    description: "Định dạng báo cáo ('json'|'csv'). Mặc định 'json'.",
  })
  @Get('revenue/report')
  async getRevenueReport(
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('format') format?: string,
  ) {
    return await this._transactionService.generateRevenueReport({
      startDate,
      endDate,
      format: format || 'json',
    });
  }

  @ApiOperation({ summary: 'Export danh sách giao dịch' })
  @ApiResponse({ status: 200, description: 'Dữ liệu export giao dịch.' })
  @Get('billing/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @ApiOperation({ summary: 'Lấy lịch sử billing với filters' })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Lọc theo ID người dùng (admin có thể truy vấn cho user khác).',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    example: '2025-01-01',
    description: 'Ngày bắt đầu lọc (ISO 8601).',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    example: '2025-12-31',
    description: 'Ngày kết thúc lọc (ISO 8601).',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'paid', 'failed'],
    description: "Lọc theo trạng thái ('pending','paid','failed').",
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Số trang (mặc định 1).',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: 'Số mục trên trang (mặc định 20).',
  })
  @ApiResponse({
    status: 200,
    description: 'Billing history with filters',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              amount: { type: 'number' },
              currency: { type: 'string' },
              status: { type: 'string' },
              description: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' },
              subscription_id: { type: 'string' },
              plan_name: { type: 'string' },
              invoice_url: { type: 'string' },
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
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  async getBillingHistory(
    @Req() req: AuthenticatedRequest,
    @Query('userId') queryUserId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    // Admin can view all, users can only view their own
    const targetUserId = userRole === 'admin' ? queryUserId : userId;
    if (!targetUserId) {
      throw new HttpException('Người dùng chưa đăng nhập', HttpStatus.UNAUTHORIZED);
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const where: Record<string, any> = {
      user_id: targetUserId,
    };

    if (status) where.status = status;
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(startDate);
      if (endDate) where.created_at.lte = new Date(endDate);
    }

    const result = await this._transactionService.list({
      page: pageNum,
      limit: limitNum,
      user_id: targetUserId,
      status: status || undefined,
    });

    // Filter by date range if provided
    let filteredData = result.items;
    if (startDate || endDate) {
      filteredData = result.items.filter((transaction: any) => {
        const txDate = new Date(transaction.created_at);
        if (startDate && txDate < new Date(startDate)) return false;
        if (endDate && txDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Transform data for billing history
    const transformedData = filteredData.map((transaction: any) => ({
      id: transaction.tx_id,
      amount: transaction.amount_total,
      currency: transaction.currency,
      status: transaction.status,
      status_display: this.getStatusDisplayText(transaction.status),
      description:
        transaction.description ||
        `Thanh toán cho gói ${transaction.subscriptions?.plan_code || 'dịch vụ'}`,
      created_at: transaction.created_at,
      subscription_id: transaction.subscription_id,
      plan_name: transaction.subscriptions?.plan_code,
      invoice_url: `/api/transactions/invoices/${transaction.tx_id}/download`,
    }));

    return {
      data: transformedData,
      pagination: result.pagination,
    };
  }
  async exportTransactions(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('user_id') user_id?: string,
    @Query('format') format?: string,
  ) {
    // Get transactions using existing list method
    const transactions = await this._transactionService.list({
      page: 1,
      limit: 1000, // Large limit for export
      user_id,
      status,
    });

    // Format for export
    const exportData = {
      data: transactions.items,
      total: transactions.pagination.total,
      format: format || 'json',
      exported_at: new Date().toISOString(),
      filters: { from, to, status, user_id },
    };

    return exportData;
  }

  @ApiOperation({ summary: 'Download invoice HTML' })
  @ApiResponse({ status: 200, description: 'Invoice HTML file download.' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Roles('admin', 'customer')
  @Get('invoices/:invoiceId/download')
  @LogActivity({
    action: 'download_invoice',
    action_enum: ActivityAction.EXPORT,
    resource_type: 'invoice',
    resource_id: 'invoiceId',
    severity: ActivitySeverity.INFO,
    message: 'Download invoice',
  })
  async downloadInvoice(
    @Req() req: AuthenticatedRequest,
    @Param('invoiceId') invoiceId: string,
    @Res() res: Response,
  ) {
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    // Find transaction by tx_id (invoiceId is tx_id for now)
    const transaction = await this._prisma.transactions.findFirst({
      where: { tx_id: invoiceId },
      include: {
        subscriptions: {
          include: {
            users: true,
            plans: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new HttpException('Invoice not found', HttpStatus.NOT_FOUND);
    }

    // Check ownership: admin can download all, customers can only download their own invoices
    if (userRole !== 'admin') {
      if (!transaction.subscriptions || transaction.subscriptions.user_id !== userId) {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }
    }

    // Generate HTML invoice (simple implementation)
    const htmlInvoice = this.generateInvoiceHtml(transaction);

    // Set headers for download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceId}.html"`);

    // Send HTML content
    res.send(htmlInvoice);
  }

  /**
   * Generate simple HTML invoice
   */
  private generateInvoiceHtml(transaction: any): string {
    const tx = transaction as any;
    const subscription = tx.subscriptions;
    const user = subscription?.users;
    const plan = subscription?.plans;

    const invoiceDate = new Date(tx.created_at).toLocaleDateString('vi-VN');
    const rawAmount = tx.amount_total ?? tx.amount ?? 0;
    const numericAmount = Number(rawAmount ?? 0);
    const amount = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: tx.currency || 'VND',
    }).format(numericAmount);

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${tx.tx_id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .invoice-details { margin-bottom: 30px; }
        .invoice-details table { width: 100%; border-collapse: collapse; }
        .invoice-details td { padding: 8px; border: 1px solid #ddd; }
        .invoice-details .label { font-weight: bold; background-color: #f5f5f5; }
        .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
        .footer { margin-top: 50px; font-size: 12px; color: #666; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Healthcare Vision</h1>
        <h2>HÓA ĐƠN THANH TOÁN</h2>
    </div>

    <div class="invoice-details">
        <table>
            <tr>
                <td class="label">Mã hóa đơn:</td>
                <td>${tx.tx_id}</td>
                <td class="label">Ngày phát hành:</td>
                <td>${invoiceDate}</td>
            </tr>
            <tr>
                <td class="label">Khách hàng:</td>
                <td>${user?.full_name || user?.username || 'N/A'}</td>
                <td class="label">Email:</td>
                <td>${user?.email || 'N/A'}</td>
            </tr>
            <tr>
                <td class="label">Gói dịch vụ:</td>
                <td>${plan?.name || 'N/A'}</td>
                <td class="label">Trạng thái:</td>
                <td>${tx.status === 'paid' ? 'Đã thanh toán' : tx.status}</td>
            </tr>
        </table>
    </div>

    <div class="total">
        Tổng tiền: ${amount}
    </div>

    <div class="footer">
        <p>Cảm ơn quý khách đã sử dụng dịch vụ của Healthcare Vision!</p>
        <p>Hóa đơn được tạo tự động vào ${new Date().toLocaleString('vi-VN')}</p>
    </div>
</body>
</html>`;
  }

  /**
   * Get display text for transaction status in Vietnamese
   */
  private getStatusDisplayText(status: string): string {
    switch (status) {
      case 'paid':
        return 'Đã thanh toán';
      case 'pending':
        return 'Chờ thanh toán';
      case 'failed':
        return 'Thanh toán thất bại';
      case 'cancelled':
      case 'canceled':
        return 'Đã hủy';
      case 'refunded':
        return 'Đã hoàn tiền';
      case 'draft':
        return 'Nháp';
      default:
        return status;
    }
  }
}
