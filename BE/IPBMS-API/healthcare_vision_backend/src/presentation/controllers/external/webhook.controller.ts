import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  @ApiOperation({
    summary: 'Nhận Webhook từ Nhà Cung Cấp Thanh Toán',
    description:
      'Xử lý webhook từ các nhà cung cấp thanh toán (Momo, ZaloPay, Stripe, v.v.) để cập nhật trạng thái thanh toán. Xác thực chữ ký và xử lý cập nhật giao dịch/thanh toán.',
  })
  @ApiParam({
    name: 'provider',
    description: 'Tên nhà cung cấp thanh toán (momo, zalopay, stripe, v.v.)',
    example: 'momo',
  })
  @ApiBody({
    description: 'Dữ liệu webhook từ nhà cung cấp thanh toán',
    schema: {
      type: 'object',
      additionalProperties: true,
      examples: {
        momo: {
          summary: 'Ví dụ webhook Momo',
          value: {
            partnerCode: 'MOMO',
            orderId: 'order123',
            requestId: 'request123',
            amount: 100000,
            orderInfo: 'Thanh toán cho đơn hàng',
            orderType: 'momo_wallet',
            transId: 'trans123',
            resultCode: 0,
            message: 'Thành công',
            payType: 'qr',
            responseTime: 1690000000000,
            extraData: '',
            signature: 'chu_ky_string',
          },
        },
        stripe: {
          summary: 'Ví dụ webhook Stripe',
          value: {
            id: 'evt_123',
            object: 'event',
            api_version: '2020-08-27',
            created: 1690000000,
            data: {
              object: {
                id: 'pi_123',
                object: 'payment_intent',
                amount: 100000,
                currency: 'vnd',
                status: 'paid',
              },
            },
            livemode: false,
            pending_webhooks: 1,
            request: {
              id: 'req_123',
              idempotency_key: null,
            },
            type: 'payment_intent.succeeded',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook đã được xử lý thành công',
    schema: {
      example: {
        message: 'Webhook cho momo đã được nhận và xử lý',
        status: 'processed',
        transactionId: 'trans123',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Chữ ký không hợp lệ, dữ liệu không đúng hoặc nhà cung cấp không được hỗ trợ',
    schema: {
      example: {
        statusCode: 400,
        message: 'Chữ ký không hợp lệ',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi máy chủ nội bộ khi xử lý webhook',
    schema: {
      example: {
        statusCode: 500,
        message: 'Lỗi máy chủ nội bộ',
        error: 'Internal Server Error',
      },
    },
  })
  @Post(':provider')
  @LogActivity({
    action: 'handle_webhook',
    action_enum: ActivityAction.CREATE,
    message: 'Xử lý webhook thanh toán',
    resource_type: 'webhook',
    resource_id: 'provider',
    resource_name: 'provider',
    severity: ActivitySeverity.HIGH,
  })
  async handleWebhook(@Param('provider') provider: string, @Body() body: any, @Req() req: any) {
    return { message: `Webhook for ${provider} received (implement logic)` };
  }
}
