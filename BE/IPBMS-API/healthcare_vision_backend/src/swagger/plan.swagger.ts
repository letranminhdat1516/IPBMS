import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ApiResponseCurrentPlanDto,
  ApiResponsePlanArrayDto,
  ApiResponsePlanDto,
  ApiResponseRenewPlanDto,
  ApiResponseUpdateQuotaDto,
  ApiResponseUpgradeDto,
} from '../application/dto/plans/plan-response.dto';
import { UpdateQuotaDto, UpgradePlanDto } from '../application/dto/plans/plan.dto';

export const PlanSwagger = {
  // Plans controller endpoints
  listPlans: applyDecorators(
    ApiOperation({
      summary: 'Lấy danh sách các gói dịch vụ có sẵn',
      description:
        'Endpoint công khai để lấy danh sách tất cả gói dịch vụ có sẵn trong hệ thống.\n\n' +
        'Hướng dẫn cho FE:\n' +
        '- URL: GET /api/plan\n' +
        '- Không cần Authorization header (public).\n' +
        '- Response wrapper: { success: boolean, data: Plan[], message: string, timestamp: string }\n' +
        '- Lưu ý: mỗi Plan bao gồm giá tháng canonical `price` (đơn vị nhỏ). FE nên hiển thị giá theo tháng là tuỳ chọn chính.\n' +
        "- Ví dụ gọi (browser): fetch('/api/plan').then(r => r.json())",
    }),
    ApiOkResponse({
      type: ApiResponsePlanArrayDto,
      description: 'Danh sách các gói dịch vụ (wrapper for FE)',
    }),
    ApiBadRequestResponse({
      description: 'Lỗi khi tải danh sách gói dịch vụ',
      schema: {
        example: {
          statusCode: 400,
          message: 'Không thể tải danh sách gói dịch vụ',
          error: 'Bad Request',
        },
      },
    }),
  ),

  getPlanByCode: applyDecorators(
    ApiOperation({
      summary: 'Lấy chi tiết gói dịch vụ theo code',
      description:
        'Lấy thông tin chi tiết của một gói dịch vụ cụ thể theo mã code.\n\n' +
        'Hướng dẫn cho FE:\n' +
        '- URL: GET /api/plan/:code (ví dụ: /api/plan/premium)\n' +
        '- Yêu cầu Authorization header: Bearer <JWT>\n' +
        '- Response wrapper: { success, data: Plan, message, timestamp }\n' +
        '- Lưu ý: response.plan.price là giá canonical theo tháng (đơn vị nhỏ). FE có thể yêu cầu server cung cấp plan snapshot trước khi tạo payment để đảm bảo giá ổn định (server cũng chấp nhận plan_snapshot do client gửi).\n' +
        "- Ví dụ gọi: fetch('/api/plan/premium', { headers: { Authorization: 'Bearer <token>' } })",
    }),
    ApiOkResponse({
      type: ApiResponsePlanDto,
      description: 'Thông tin chi tiết của gói dịch vụ (wrapper)',
    }),
    ApiUnauthorizedResponse({
      description: 'Không có quyền truy cập',
      schema: {
        example: {
          statusCode: 401,
          message: 'Thiếu thông tin userId trong JWT token',
          error: 'Unauthorized',
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Không tìm thấy gói dịch vụ',
      schema: {
        example: {
          statusCode: 404,
          message: 'Không tìm thấy gói dịch vụ với code này',
          error: 'Not Found',
        },
      },
    }),
  ),

  getCurrentPlan: applyDecorators(
    ApiOperation({
      summary: 'Lấy gói dịch vụ hiện tại của user đang đăng nhập',
      description:
        'Yêu cầu JWT token hợp lệ với role: admin, caregiver, hoặc customer.\n\n' +
        'Hướng dẫn cho FE:\n' +
        '- URL: GET /api/plan/current\n' +
        '- Headers: Authorization: Bearer <JWT>\n' +
        '- Hữu ích để hiển thị subscription hiện tại trên trang cài đặt tài khoản\n' +
        "- Ví dụ gọi: fetch('/api/plan/current', { headers: { Authorization: 'Bearer <token>' } })",
    }),
    ApiOkResponse({
      type: ApiResponseCurrentPlanDto,
      description: 'Thông tin gói dịch vụ + quota (wrapper)',
    }),
    ApiUnauthorizedResponse({
      description: 'Không có quyền truy cập hoặc JWT token không hợp lệ',
      schema: {
        example: {
          statusCode: 401,
          message: 'Thiếu thông tin userId trong JWT token',
          error: 'Unauthorized',
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Không tìm thấy thông tin gói dịch vụ của user',
      schema: {
        example: {
          statusCode: 404,
          message: 'Không tìm thấy thông tin gói dịch vụ của user',
          error: 'Not Found',
        },
      },
    }),
  ),

  getCurrentQuota: applyDecorators(
    ApiOperation({ summary: 'Lấy quota hiện tại của user' }),
    ApiOkResponse({
      description: 'Thông tin quota hiện tại',
      schema: {
        example: {
          quota_camera_max: 6,
          quota_fps_max: 15,
          quota_retention_days: 30,
        },
      },
    }),
  ),

  getPlanHistory: applyDecorators(
    ApiOperation({
      summary: 'Lấy lịch sử plan/quota của user',
      description:
        'Trả về lịch sử subscription và thay đổi quota của user (danh sách các bản ghi subscription/quota). Lưu ý: đây là lịch sử gói/quota (subscription timeline), không phải audit history với per-field diffs (`changes[]` / `change_count`).',
    }),
    ApiOkResponse({
      description: 'Danh sách subscriptions và quota overrides',
      schema: {
        example: {
          subscriptions: [
            { plan_id: 'FREE', activated_at: '2024-01-01', expired_at: '2024-06-01' },
            { plan_id: 'PRO', activated_at: '2024-06-02', expired_at: null },
          ],
          quotaOverrides: [
            {
              quota_camera_max: 8,
              quota_retention_days: 60,
              effective_from: '2024-07-01',
            },
          ],
        },
      },
    }),
  ),

  updatePlan: applyDecorators(
    ApiOperation({ summary: 'Cập nhật gói dịch vụ cho user (admin hoặc user)' }),
    ApiBody({
      schema: {
        example: { plan_id: 'CLINIC' },
      },
    }),
    ApiOkResponse({
      description: 'Cập nhật thành công',
      schema: { example: { updated: true } },
    }),
  ),

  upgradePlan: applyDecorators(
    ApiOperation({
      summary: 'Nâng cấp gói dịch vụ - chỉ thanh toán phần chênh lệch',
      description:
        'Nâng cấp từ gói hiện tại lên gói cao hơn. ' +
        'Chỉ thanh toán phần chênh lệch giá và áp dụng ngay lập tức.',
    }),
    ApiBody({ type: UpgradePlanDto }),
    ApiOkResponse({ type: ApiResponseUpgradeDto, description: 'Thông tin nâng cấp' }),
    ApiUnauthorizedResponse({
      description: 'Không có quyền truy cập',
      schema: {
        example: {
          statusCode: 401,
          message: 'Thiếu thông tin userId trong JWT token',
          error: 'Unauthorized',
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Dữ liệu đầu vào không hợp lệ',
      schema: {
        example: {
          statusCode: 400,
          message: 'Thiếu plan_code trong request body',
          error: 'Bad Request',
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Không tìm thấy subscription hoặc plan',
      schema: {
        example: {
          statusCode: 404,
          message: 'Không tìm thấy subscription đang hoạt động',
          error: 'Not Found',
        },
      },
    }),
  ),

  renewPlan: applyDecorators(
    ApiOperation({
      summary: 'Tạo link thanh toán gia hạn gói hiện tại',
      description:
        "Dùng khi auto-renew bị tắt. Backend tạo payment VNPay cho gói hiện tại để người dùng tự thanh toán. Body hỗ trợ các trường optional 'billing_period' (monthly) để chọn chu kỳ mong muốn và 'billing_type' (prepaid/postpaid) để lưu hình thức thanh toán dự kiến.",
    }),
    ApiOkResponse({
      type: ApiResponseRenewPlanDto,
      description: 'Thông tin payment gia hạn (wrapper)',
    }),
    ApiUnauthorizedResponse({
      description: 'Không có quyền truy cập',
      schema: {
        example: {
          statusCode: 401,
          message: 'Thiếu thông tin userId trong JWT token',
          error: 'Unauthorized',
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Không thể tạo link gia hạn',
      schema: {
        example: {
          statusCode: 400,
          message: 'Không tìm thấy subscription đang hoạt động',
          error: 'Bad Request',
        },
      },
    }),
  ),

  getRenewalStatus: applyDecorators(
    ApiOperation({
      summary: 'Kiểm tra payment gia hạn đang chờ',
      description: 'Trả về thông tin payment VNPay đang pending (nếu có).',
    }),
    ApiOkResponse({
      description: 'Thông tin payment pending hoặc null',
      schema: {
        example: {
          success: true,
          data: {
            paymentId: 'uuid',
            amount: 990000,
            description: 'Renewal for Premium',
            createdAt: '2025-10-20T12:15:00.000Z',
            expiresAt: '2025-10-20T12:30:00.000Z',
            vnpTxnRef: 'ABC123',
            billing_period: 'monthly',
            billing_type: 'prepaid',
          },
          message: 'Đang có payment gia hạn pending',
          timestamp: '2025-10-20T12:20:00.000Z',
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Không có quyền truy cập',
      schema: {
        example: {
          statusCode: 401,
          message: 'Thiếu thông tin userId trong JWT token',
          error: 'Unauthorized',
        },
      },
    }),
  ),

  cancelRenewal: applyDecorators(
    ApiOperation({
      summary: 'Hủy payment gia hạn đang chờ',
      description:
        'Hủy liên kết thanh toán VNPay còn pending cho gói hiện tại. Sử dụng khi người dùng đổi ý sau khi tạo link gia hạn.',
    }),
    ApiOkResponse({
      description: 'Payment gia hạn đã được hủy',
      schema: {
        example: {
          success: true,
          data: {
            paymentId: 'uuid',
            status: 'cancelled',
            billing_period: 'monthly',
            billing_type: 'prepaid',
          },
          message: 'Đã hủy payment gia hạn đang chờ',
          timestamp: '2025-10-20T12:30:00.000Z',
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Không có quyền truy cập',
      schema: {
        example: {
          statusCode: 401,
          message: 'Thiếu thông tin userId trong JWT token',
          error: 'Unauthorized',
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Không thể hủy payment',
      schema: {
        example: {
          statusCode: 400,
          message: 'Không có payment pending cần hủy',
          error: 'Bad Request',
        },
      },
    }),
  ),

  downgradePlan: applyDecorators(
    ApiOperation({
      summary: 'Hạ cấp gói dịch vụ - chỉ áp dụng khi hết hạn hiện tại',
      description:
        'Hạ cấp từ gói hiện tại xuống gói thấp hơn. ' +
        'Chỉ có thể thực hiện khi đã hết hạn gói hiện tại.',
    }),
    ApiBody({ type: UpgradePlanDto }),
    ApiOkResponse({ type: ApiResponseUpgradeDto, description: 'Thông tin hạ cấp' }),
    ApiUnauthorizedResponse({
      description: 'Không có quyền truy cập',
      schema: {
        example: {
          statusCode: 401,
          message: 'Thiếu thông tin userId trong JWT token',
          error: 'Unauthorized',
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Dữ liệu đầu vào không hợp lệ hoặc chưa hết hạn',
      schema: {
        example: {
          statusCode: 400,
          message: 'Không thể hạ cấp khi chưa hết hạn gói hiện tại',
          error: 'Bad Request',
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Không tìm thấy subscription hoặc plan',
      schema: {
        example: {
          statusCode: 404,
          message: 'Không tìm thấy subscription đang hoạt động',
          error: 'Not Found',
        },
      },
    }),
  ),

  updateQuota: applyDecorators(
    ApiOperation({ summary: 'Cập nhật quota cho user (admin hoặc user)' }),
    ApiBody({ type: UpdateQuotaDto }),
    ApiOkResponse({ type: ApiResponseUpdateQuotaDto, description: 'Quota đã được cập nhật' }),
  ),
};
