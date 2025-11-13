import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CreatePaymentDto } from '../application/dto/payment/payment.dto';

export const PaymentsSwagger = {
  list: applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách giao dịch thanh toán' }),
    ApiQuery({ name: 'user_id', required: false, description: 'Lọc theo user_id' }),
    ApiQuery({ name: 'plan_code', required: false, description: 'Lọc theo mã gói (plan_code)' }),
    ApiResponse({
      status: 200,
      description: 'Danh sách các giao dịch',
      schema: {
        example: [
          {
            payment_id: 'uuid',
            user_id: 'uuid',
            plan_code: 'CLINIC',
            status: 'success',
            amount: 500000,
            created_at: '2025-08-25T10:00:00Z',
          },
        ],
      },
    }),
  ),

  create: applyDecorators(
    ApiOperation({ summary: 'Tạo giao dịch thanh toán VNPay' }),
    ApiBody({
      type: CreatePaymentDto,
      examples: {
        default: {
          summary: 'Thanh toán gói CLINIC',
          value: {
            user_id: 'uuid',
            plan_code: 'CLINIC',
            description: 'Thanh toán đơn 123',
          },
        },
      },
    }),
    ApiResponse({
      status: 201,
      description: 'Tạo giao dịch mới và nhận URL thanh toán',
      schema: {
        example: { url: 'https://sandbox.vnpayment.vn/payment-link-here' },
      },
    }),
  ),

  return: applyDecorators(
    ApiOperation({ summary: 'Redirect sau thanh toán (success/fail)' }),
    ApiResponse({
      status: 200,
      description: 'Thông tin kết quả thanh toán',
      schema: {
        example: {
          status: 'success',
          message: 'Thanh toán thành công',
          transaction: {
            id: 'abc123',
            amount: 500000,
            plan_code: 'CLINIC',
          },
        },
      },
    }),
  ),

  ipn: applyDecorators(
    ApiOperation({ summary: 'Webhook VNPay IPN xác nhận giao dịch' }),
    ApiResponse({
      status: 200,
      description: 'Kết quả xử lý IPN',
      schema: {
        example: {
          RspCode: '00',
          Message: 'Confirm Success',
        },
      },
    }),
  ),

  queryDr: applyDecorators(
    ApiOperation({ summary: 'Truy vấn giao dịch từ VNPay' }),
    ApiParam({
      name: 'vnp_TxnRef',
      example: 'mee8wt1ks0kuix',
      description: 'Mã giao dịch VNPay để truy vấn',
    }),
    ApiResponse({
      status: 200,
      description: 'Thông tin truy vấn giao dịch',
      schema: {
        example: {
          vnp_TxnRef: 'mee8wt1ks0kuix',
          status: 'success',
          amount: 500000,
          transaction_date: '2025-08-25T10:00:00Z',
        },
      },
    }),
  ),

  debug: applyDecorators(
    ApiOperation({
      summary: 'Endpoint debug để kiểm tra tạo Transaction (chỉ môi trường phát triển)',
    }),
    ApiParam({
      name: 'paymentId',
      example: 'b66c12a5-48ea-4e62-b123-fb743b4d544a',
      description: 'Payment ID để kiểm tra Transaction',
    }),
    ApiResponse({
      status: 200,
      description: 'Thông tin debug về Payment và Transaction',
      schema: {
        example: {
          payment: {
            payment_id: 'b66c12a5-48ea-4e62-b123-fb743b4d544a',
            status: 'paid',
            amount: '99000',
            plan_code: 'pro',
            created_at: '2025-09-10T16:52:23.362Z',
          },
          transaction: {
            tx_id: '2506b5d4-d6e2-4250-80d9-3480ababa7b0',
            payment_id: 'b66c12a5-48ea-4e62-b123-fb743b4d544a',
            subscription_id: '58f06f90-f6ec-4d7a-9ed4-c1d5445bed6a',
            status: 'pending',
            amount_total: '99000',
            created_at: '2025-09-10T16:52:19.384Z',
          },
        },
      },
    }),
  ),

  billingHistory: applyDecorators(
    ApiOperation({ summary: 'Lấy lịch sử billing (summary list)' }),
    ApiQuery({ name: 'userId', required: false, type: String }),
    ApiQuery({ name: 'startDate', required: false, type: String, example: '2025-01-01' }),
    ApiQuery({ name: 'endDate', required: false, type: String, example: '2025-12-31' }),
    ApiQuery({ name: 'status', required: false, enum: ['pending', 'paid', 'failed'] }),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
    ApiResponse({
      status: 200,
      description:
        'Lịch sử thanh toán (dạng tóm tắt). Lưu ý: Endpoint này trả về bản tóm tắt các bản ghi thanh toán — không phải audit history theo từng trường với `changes[]` / `change_count`. Sử dụng các endpoint lịch sử chuyên biệt để lấy khác biệt theo trường nếu có.',
    }),
  ),
};
