import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  AdminLoginDto,
  CaregiverLoginDto,
  CaregiverRegisterDto,
  LoginOtpDto,
  RequestOtpDto,
} from '../application/dto/auth/auth.dto';

export const AuthSwagger = {
  resetOtp: applyDecorators(
    ApiOperation({ summary: 'Xoá OTP đã gửi cho một số điện thoại' }),
    ApiBody({
      schema: {
        example: { phone_number: '84369744023' },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Xóa OTP thành công',
      schema: {
        example: { message: 'Đã xóa OTP cho số 84369744023' },
      },
    }),
  ),

  requestOtp: applyDecorators(
    ApiOperation({ summary: 'Yêu cầu gửi OTP (SMS hoặc Voice call)' }),
    ApiBody({
      type: RequestOtpDto,
      examples: {
        call: {
          summary: 'OTP qua Voice Call',
          value: { phone_number: '84865081427', method: 'call' },
        },
        sms: { summary: 'OTP qua SMS', value: { phone_number: '84865081427', method: 'sms' } },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Kết quả gửi OTP',
      schema: {
        example: {
          success: true,
          message: 'OTP đã được gửi thành công',
          phone_number: '84865081427',
          method: 'sms',
          expires_at: '2025-08-28T12:34:56.789Z',
          expires_in: '5 phút',
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Gửi OTP thất bại nhưng OTP vẫn được lưu để xác thực dự phòng',
      schema: {
        example: {
          success: false,
          message: 'Không thể gửi OTP qua SMS',
          reason: 'Twilio: Message cannot be sent with the current combination of To/From',
          phone_number: '84865081427',
          method: 'sms',
          expires_at: '2025-08-28T12:34:56.789Z',
          expires_in: '5 phút',
        },
      },
    }),
  ),

  loginOtp: applyDecorators(
    ApiOperation({ summary: 'Đăng nhập bằng mã OTP' }),
    ApiBody({
      type: LoginOtpDto,
      examples: {
        default: {
          summary: 'Đăng nhập với OTP',
          value: { phone_number: '84865081427', otp_code: '123456' },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Đăng nhập thành công',
      schema: {
        example: {
          access_token: '<jwt_token>',
          user: {
            user_id: 'uuid',
            username: 'user123',
            full_name: 'Nguyen Van A',
            email: 'user@example.com',
            role: 'customer',
            phone_number: '84865081427',
            is_first_login: true,
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'OTP sai hoặc hết hạn',
      schema: {
        example: {
          statusCode: 401,
          message: 'Mã OTP không hợp lệ',
          error: 'Unauthorized',
        },
      },
    }),
  ),

  adminLogin: applyDecorators(
    ApiOperation({ summary: 'Đăng nhập admin bằng email/password' }),
    ApiBody({ type: AdminLoginDto }),
    ApiResponse({ status: 200, description: 'Đăng nhập thành công' }),
    ApiResponse({ status: 401, description: 'Sai thông tin đăng nhập' }),
  ),

  caregiverRegister: applyDecorators(
    ApiOperation({ summary: 'Đăng ký caregiver bằng email/phone/password' }),
    ApiBody({ type: CaregiverRegisterDto }),
    ApiResponse({ status: 201, description: 'Đăng ký người chăm sóc thành công' }),
  ),

  caregiverLogin: applyDecorators(
    ApiOperation({ summary: 'Đăng nhập người chăm sóc bằng email/mật khẩu' }),
    ApiBody({ type: CaregiverLoginDto }),
    ApiResponse({ status: 200, description: 'Đăng nhập thành công' }),
    ApiResponse({ status: 401, description: 'Sai thông tin đăng nhập' }),
  ),

  me: applyDecorators(
    ApiOperation({ summary: 'Lấy thông tin người dùng hiện tại kèm thông tin bệnh nhân' }),
    ApiBearerAuth(),
    ApiResponse({
      status: 200,
      description: 'Thông tin hồ sơ người dùng',
      schema: {
        example: {
          user: {
            user_id: 'uuid',
            username: 'user123',
            full_name: 'Nguyen Van A',
            email: 'user@example.com',
            role: 'customer',
            phone_number: '84865081427',
            is_active: true,
            created_at: '2025-09-04T10:00:00Z',
            patient: {
              patient_id: 'uuid',
              patient_name: 'Nguyen Van A',
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Thông tin caregiver với danh sách bệnh nhân',
      schema: {
        example: {
          user: {
            user_id: 'uuid',
            username: 'caregiver123',
            full_name: 'Nguyen Van B',
            email: 'caregiver@example.com',
            role: 'caregiver',
            phone_number: '84987654321',
            is_active: true,
            created_at: '2025-09-04T10:00:00Z',
            patients: [
              {
                patient_id: 'uuid',
                patient_name: 'Trinh Dang Khoi',
                permissions: {
                  stream_view: true,
                  alert_read: true,
                  alert_ack: false,
                  profile_view: true,
                  log_access_days: 7,
                  report_access_days: 30,
                  notification_channel: ['push', 'sms'],
                },
              },
            ],
          },
        },
      },
    }),
  ),

  logout: applyDecorators(
    ApiOperation({ summary: 'Đăng xuất (hủy token phía client)' }),
    ApiBearerAuth(),
    ApiResponse({ status: 200, description: 'Đã đăng xuất' }),
  ),

  refresh: applyDecorators(
    ApiOperation({ summary: 'Refresh token để lấy access_token mới' }),
    ApiBearerAuth(),
    ApiResponse({ status: 200, description: 'Access token mới' }),
  ),

  firebaseLogin: applyDecorators(
    ApiOperation({ summary: 'Đăng nhập bằng Firebase ID token (sau khi xác thực OTP từ client)' }),
    ApiBody({
      schema: {
        example: {
          id_token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2YjJh... (Firebase ID token)',
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Đăng nhập thành công với Firebase',
      schema: {
        example: {
          access_token: '<jwt_token>',
          user: {
            user_id: 'uuid',
            username: 'user123',
            full_name: 'Nguyen Van A',
            email: 'user@example.com',
            role: 'customer',
            phone_number: '84865081427',
            is_first_login: true,
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Token không hợp lệ hoặc user chưa đăng ký',
      schema: {
        example: {
          statusCode: 401,
          message: 'Không tìm thấy user với số điện thoại Firebase.',
          error: 'Unauthorized',
        },
      },
    }),
  ),

  firebaseLoginWithFcm: applyDecorators(
    ApiOperation({ summary: 'Đăng nhập Firebase và tự động đăng ký FCM token' }),
    ApiBody({
      schema: {
        example: {
          // Backend chấp nhận cả id_token hoặc verification_id ở đây. Ưu tiên sử dụng id_token từ getIdToken().
          id_token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2YjJh... (Firebase ID token)',
          // FCM token có thể được cung cấp dưới tên `fcm_token` (ở các endpoint auth) hoặc `token` (ở các endpoint fcm).
          fcm_token: 'fcm_token_from_device',
          platform: 'android',
          // Device ID hỗ trợ cả `device_id` và `deviceId`. Độ dài tối đa: 100 ký tự.
          device_id: 'unique_device_id',
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Đăng nhập thành công và FCM token đã được đăng ký',
      schema: {
        example: {
          access_token: '<jwt_token>',
          user: {
            user_id: 'uuid',
            username: 'user123',
            full_name: 'Nguyen Van A',
            email: 'user@example.com',
            role: 'customer',
            phone_number: '84865081427',
            is_first_login: true,
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Token không hợp lệ hoặc user chưa đăng ký',
    }),
  ),

  firebasePhoneAuth: applyDecorators(
    ApiOperation({ summary: 'Xác thực Firebase Phone Authentication' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          verification_id: {
            type: 'string',
            description: 'Firebase verification ID từ client',
            example: 'verification_id_from_firebase',
          },
          sms_code: {
            type: 'string',
            description: 'Mã SMS nhận được từ Firebase',
            example: '123456',
          },
          phone_number: {
            type: 'string',
            description: 'Số điện thoại đã được xác thực',
            example: '+84865081427',
          },
          fcm_token: {
            type: 'string',
            description: 'FCM token từ device (optional)',
            example: 'fcm_token_from_device',
          },
          platform: {
            type: 'string',
            enum: ['android', 'ios', 'web'],
            description: 'Platform của device',
            example: 'android',
          },
          device_id: {
            type: 'string',
            description: 'Device ID (optional)',
            example: 'unique_device_id',
          },
        },
        required: ['verification_id', 'sms_code', 'phone_number'],
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Xác thực thành công',
      schema: {
        example: {
          access_token: '<jwt_token>',
          user: {
            user_id: 'uuid',
            username: 'user123',
            full_name: 'User +84865081427',
            email: null,
            role: 'customer',
            phone_number: '+84865081427',
            is_first_login: true,
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Xác thực thất bại - verification ID hoặc SMS code không hợp lệ',
    }),
  ),
};
