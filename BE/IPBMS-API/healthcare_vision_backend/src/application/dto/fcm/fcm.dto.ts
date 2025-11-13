import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { parseJsonOrUndefined } from '../../../shared/utils';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export class BulkTokenDto {
  @ApiProperty({
    description:
      'UUID (v4) của người dùng sở hữu các FCM token. Trường này dùng để xác định chủ sở hữu của các token trong payload bulk. Nếu giá trị không hợp lệ, request sẽ bị từ chối.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Mảng chứa các FCM token của thiết bị (ứng dụng trên device). Mỗi phần tử là một chuỗi token do Firebase trả về. Ví dụ: ["fcm_token_device_1", "fcm_token_device_2"].',
    example: ['fcm_token_device_1', 'fcm_token_device_2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  device?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Mảng chứa FCM token thuộc về các caregiver liên quan. Sử dụng khi cập nhật hoặc gửi thông báo cho caregiver.',
    example: ['fcm_token_cg_1'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  caregiver?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Mảng chứa FCM token được đánh dấu là khẩn cấp (emergency). Dùng cho các thông báo ưu tiên cao, có thể ảnh hưởng đến cách gửi và hành vi client.',
    example: ['fcm_token_emergency_1'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emergency?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Mảng chứa FCM token của customer (người bệnh). Dùng để gửi thông báo trực tiếp tới thiết bị của customer.',
    example: ['fcm_token_cust_1'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customer?: string[];
}

export class SaveTokenDto {
  @ApiProperty({
    description:
      'UUID (v4) của người dùng sở hữu token. Nếu JWT chứa userId, server có thể ưu tiên lấy từ JWT. Trường này dùng để kiểm tra quyền sở hữu khi lưu token.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  userId!: string;

  @ApiProperty({
    description:
      'Giá trị FCM token (chuỗi) được trả về bởi Firebase. Hỗ trợ alias: thuộc tính có tên `token` hoặc `fcm_token` trong payload sẽ được chuyển vào đây nhờ transform. Không nên chứa thông tin nhạy cảm.',
    example: 'dYuRc9dDTHmqo5H6nUyRHn:APA91b...',
  })
  @IsString()
  @Transform(({ value, obj }) => obj.token ?? obj.fcm_token ?? value)
  token!: string;

  @ApiProperty({
    description:
      'Phân loại token xác định ngữ cảnh sử dụng: "device" (ứng dụng trên thiết bị), "caregiver" (token dành cho caregiver), "emergency" (thông báo khẩn cấp), "customer" (token của customer/người bệnh).',
    enum: ['device', 'caregiver', 'emergency', 'customer'],
    example: 'device',
  })
  @IsIn(['device', 'caregiver', 'emergency', 'customer'])
  type!: 'device' | 'caregiver' | 'emergency' | 'customer';

  @ApiPropertyOptional({
    description:
      'Nền tảng thiết bị phát sinh token. Dùng để phân tích hoặc gửi payload phù hợp (ví dụ: android có cấu trúc data khác với web). Giá trị có thể là "android", "ios" hoặc "web".',
    enum: ['android', 'ios', 'web'],
    example: 'android',
  })
  @IsOptional()
  @IsIn(['android', 'ios', 'web'])
  platform?: 'android' | 'ios' | 'web';

  @ApiPropertyOptional({
    description:
      'ID vật lý của thiết bị tạo token (nếu có). Có thể là deviceId, IMEI, hoặc UUID do client sinh. Dùng để gỡ lỗi/tracking; giới hạn độ dài tối đa 100 ký tự.',
    example: 'device-abc-123',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value, obj }) => obj.deviceId ?? obj.device_id ?? value)
  @MaxLength(100)
  deviceId?: string;
}

export class UpdateTokenDto {
  @ApiProperty({
    description:
      'UUID (v4) của người dùng chủ token. Dùng để xác thực quyền sửa token. Yêu cầu: user phải có quyền sở hữu token hoặc quyền quản trị.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  userId!: string;

  @ApiProperty({
    description:
      'Giá trị FCM token hiện tại/đang lưu mà client muốn thay thế. Hệ thống sẽ tìm bản ghi bằng giá trị này trước khi cập nhật.',
    example: 'old_fcm_token_value',
  })
  @IsString()
  oldToken!: string;

  @ApiProperty({
    description:
      'Giá trị FCM token mới sẽ thay thế token cũ. Sau cập nhật, hệ thống sẽ dùng token này để gửi thông báo tới thiết bị.',
    example: 'new_fcm_token_value',
  })
  @IsString()
  newToken!: string;

  @ApiPropertyOptional({
    description:
      'Loại token mới (tùy chọn). Nếu không cung cấp, loại hiện tại của token sẽ được giữ nguyên. Các giá trị hợp lệ: device, caregiver, emergency, customer.',
    enum: ['device', 'caregiver', 'emergency', 'customer'],
    example: 'device',
  })
  @IsOptional()
  @IsIn(['device', 'caregiver', 'emergency', 'customer'])
  type?: 'device' | 'caregiver' | 'emergency' | 'customer';

  @ApiPropertyOptional({
    description:
      'Nền tảng của token mới (tùy chọn). Sử dụng để thay đổi metadata nếu token di chuyển giữa nền tảng.',
    enum: ['android', 'ios', 'web'],
    example: 'ios',
  })
  @IsOptional()
  @IsIn(['android', 'ios', 'web'])
  platform?: 'android' | 'ios' | 'web';
}

export class DeleteTokenDto {
  @ApiPropertyOptional({
    description:
      'UUID (v4) của người dùng. Nếu không gửi, server có thể lấy từ JWT hiện tại (nếu có). Dùng để xác định bản ghi token cần xóa và kiểm tra quyền.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    description:
      'Giá trị FCM token cần xóa khỏi hệ thống. Token này nên trùng khớp với một trong các token đã lưu cho user. Nếu token không tồn tại, API có thể trả 404 hoặc trả ok (idempotent).',
    example: 'dYuRc9dDTHmqo5H6nUyRHn:APA91b...',
  })
  @IsString()
  token!: string;
}

export class SystemEventDto {
  @ApiProperty({
    description:
      'UUID (v4) của customer - chủ thể của sự kiện hệ thống (ví dụ: bệnh nhân bị ngã). Dùng để liên kết event với đối tượng thực tế.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  customerId!: string;

  @ApiProperty({
    description:
      'ID sự kiện nội bộ (chuỗi) do hệ thống sinh hoặc external system cung cấp. Dùng để tham chiếu chi tiết sự kiện.',
    example: 'evt-12345',
  })
  @IsString()
  eventId!: string;

  @ApiProperty({
    description:
      'Loại sự kiện đã được phát hiện (chuỗi). Ví dụ: "fall" (ngã), "seizure" (co giật), "abnormal" (bất thường). Hệ thống dùng giá trị này để chọn template thông báo hoặc policiy xử lý.',
    example: 'fall',
  })
  @IsString()
  eventType!: string;

  @ApiPropertyOptional({
    description:
      'Tiêu đề hiển thị trong notification. Nếu không cung cấp, hệ thống sẽ sinh tiêu đề mặc định dựa trên eventType.',
    example: 'Ngã tại phòng 12',
  })
  title?: string;

  @ApiPropertyOptional({
    description:
      'Nội dung (body) hiển thị trong notification. Nên ngắn gọn, chứa thông tin cốt lõi như vị trí và mức độ khẩn cấp.',
    example: 'Hệ thống phát hiện ngã của bệnh nhân tại phòng 12. Vui lòng kiểm tra.',
  })
  body?: string;

  @ApiPropertyOptional({
    description:
      'URL hoặc deep link để mở chi tiết sự kiện trong ứng dụng khi người dùng bấm vào notification. Hỗ trợ schema custom như myapp://...',
    example: 'myapp://event/evt-12345',
  })
  deeplink?: string;

  @ApiPropertyOptional({
    description:
      'Đối tượng key-value chứa metadata bổ sung cho notification hoặc xử lý phía client (ví dụ priority, location, timestamp). Tất cả giá trị sẽ được stringified trước khi gửi.',
    type: Object,
    example: { priority: 'high', location: 'room-12' },
  })
  @IsOptional()
  extra?: Record<string, string>;
}

export class ActorMessageDto {
  @ApiProperty({
    type: [String],
    description:
      'Mảng UUID (v4) của người nhận (recipients). Số lượng tối thiểu 1, tối đa 50. Hệ thống sẽ chỉ gửi tới những người có quan hệ phù hợp theo direction và có token còn hoạt động.',
    example: ['24931cc6-4935-4b9e-a860-96b4e5cd7b7f'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  toUserIds!: string[];

  @ApiProperty({
    enum: ['customer_to_caregiver', 'caregiver_to_customer'],
    description:
      'Hướng gửi tin nhắn xác định mối quan hệ giữa sender và recipients: "customer_to_caregiver" nghĩa là từ customer gửi tới caregiver; "caregiver_to_customer" ngược lại. Hệ thống sẽ kiểm tra quyền gửi theo hướng này và chỉ gửi tới recipients hợp lệ.',
    example: 'customer_to_caregiver',
  })
  @IsIn(['customer_to_caregiver', 'caregiver_to_customer'])
  direction!: 'customer_to_caregiver' | 'caregiver_to_customer';

  @ApiProperty({
    enum: ['help', 'reminder', 'report', 'confirm'],
    description:
      'Danh mục/nhãn tin nhắn để client hoặc backend xử lý khác nhau: "help" (yêu cầu giúp đỡ), "reminder" (nhắc nhở), "report" (báo cáo), "confirm" (xác nhận hành động).',
    example: 'help',
  })
  @IsIn(['help', 'reminder', 'report', 'confirm'])
  category!: 'help' | 'reminder' | 'report' | 'confirm';

  @ApiProperty({
    description:
      'Nội dung tin nhắn hiển thị cho người nhận. Kích thước tối thiểu 1 ký tự, tối đa 512 ký tự. Tránh chứa thông tin nhạy cảm.',
    minLength: 1,
    maxLength: 512,
    example: 'Xin hãy kiểm tra bệnh nhân tại phòng 12. Có dấu hiệu bất thường.',
  })
  @IsString()
  @Length(1, 512)
  message!: string;

  @ApiPropertyOptional({
    description:
      'Deep link hoặc URL để mở chi tiết cuộc trò chuyện hoặc màn hình liên quan khi người dùng bấm notification. Ví dụ: myapp://chat/123',
    example: 'myapp://chat/123',
  })
  @IsOptional()
  @IsString()
  deeplink?: string;

  @ApiPropertyOptional({
    description:
      'FCM token của thiết bị gửi (tùy chọn). Nếu cung cấp, server có thể xác thực token này thuộc về sender để tăng tính an toàn và ngăn mạo danh.',
    example: 'dYuRc9dDTHmqo5H6nUyRHn:APA91b...',
  })
  @IsOptional()
  @IsString()
  fromToken?: string;

  @ApiProperty({
    description:
      'UUID (v4) của người gửi (sender). Trường này dùng để kiểm tra quyền, ghi log hoạt động và liên kết message với tác nhân thực hiện.',
    example: 'a3d2c1b4-5e6f-7a8b-9c0d-ef1234567890',
  })
  @IsUUID('4')
  fromUserId!: string;

  @ApiPropertyOptional({
    description:
      'Đối tượng key-value tùy chọn chứa metadata bổ sung cho message (ví dụ: { "callId": "abc", "severity": "high" }). Tất cả giá trị sẽ được chuyển thành chuỗi trước khi lưu/gửi.',
    type: Object,
    example: { callId: 'call-123', severity: 'high' },
  })
  @IsOptional()
  @IsObject()
  @Transform((params) => {
    const value = parseJsonOrUndefined(params);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, String(v)]));
    }
    return undefined;
  })
  extra?: Record<string, string>;
}

// DTOs for direct notification sending
export class SendToUserDto {
  @ApiProperty({
    description:
      'Payload thông báo FCM chứa nội dung hiển thị và dữ liệu tùy chọn. Bao gồm notification (hiển thị trên device) và data (dữ liệu tùy chỉnh cho app xử lý).',
    type: Object,
    example: {
      notification: {
        title: 'Thông báo quan trọng',
        body: 'Bạn có thông báo mới từ hệ thống',
      },
      data: {
        type: 'system_alert',
        priority: 'high',
        actionUrl: '/alerts/123',
      },
    },
  })
  @IsObject()
  payload!: any;

  @ApiPropertyOptional({
    description:
      'Tùy chọn gửi nâng cao cho FCM. Bao gồm cấu hình platform-specific (Android, iOS, Web), TTL, priority, và các tùy chọn khác.',
    type: Object,
    example: {
      android: {
        priority: 'high',
        notification: {
          channelId: 'alerts',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
          },
        },
      },
    },
  })
  @IsOptional()
  @IsObject()
  options?: any;
}

export class SendToUsersDto {
  @ApiProperty({
    description:
      'Mảng UUID của các user nhận thông báo. Mỗi user sẽ nhận thông báo trên tất cả thiết bị active của họ.',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayNotEmpty()
  @ArrayMaxSize(100) // Giới hạn số lượng users để tránh spam
  userIds!: string[];

  @ApiProperty({
    description:
      'Payload thông báo FCM chứa nội dung hiển thị và dữ liệu tùy chọn. Bao gồm notification (hiển thị trên device) và data (dữ liệu tùy chỉnh cho app xử lý).',
    type: Object,
    example: {
      notification: {
        title: 'Cập nhật hệ thống',
        body: 'Hệ thống đã được cập nhật với tính năng mới',
      },
      data: {
        type: 'system_update',
        version: '2.1.0',
        changelogUrl: '/changelog',
      },
    },
  })
  @IsObject()
  payload!: any;

  @ApiPropertyOptional({
    description:
      'Tùy chọn gửi nâng cao cho FCM. Bao gồm cấu hình platform-specific (Android, iOS, Web), TTL, priority, và các tùy chọn khác.',
    type: Object,
    example: {
      android: {
        priority: 'normal',
        ttl: 86400, // 24 hours
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    },
  })
  @IsOptional()
  @IsObject()
  options?: any;
}

export class SendNotificationResponseDto {
  @ApiProperty({
    description: 'Số lượng thông báo gửi thành công (đã đến được FCM servers)',
    example: 5,
  })
  successCount!: number;

  @ApiProperty({
    description: 'Số lượng thông báo gửi thất bại',
    example: 1,
  })
  failureCount!: number;

  @ApiProperty({
    description:
      'Mảng kết quả chi tiết từ FCM servers cho mỗi batch gửi. Bao gồm responseId, success/failure status, và error messages nếu có.',
    type: [Object],
    example: [
      {
        success: true,
        messageId: 'projects/myproject-b5ae1/messages/0:1500011451922224%7e1b3cc81b3cc8ab',
      },
      {
        success: false,
        error: 'Invalid registration token',
      },
    ],
  })
  responses!: any[];
}

export class SendToUsersResponseDto {
  @ApiProperty({
    description: 'Tổng số thông báo gửi thành công trên tất cả users',
    example: 15,
  })
  totalSuccess!: number;

  @ApiProperty({
    description: 'Tổng số thông báo gửi thất bại trên tất cả users',
    example: 3,
  })
  totalFailure!: number;

  @ApiProperty({
    description:
      'Mảng kết quả chi tiết cho từng user. Mỗi phần tử chứa userId và kết quả gửi cho user đó.',
    type: [Object],
    example: [
      {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        successCount: 3,
        failureCount: 0,
        responses: [
          {
            success: true,
            messageId: 'msg1',
          },
        ],
      },
      {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        successCount: 2,
        failureCount: 1,
        responses: [
          {
            success: false,
            error: 'Token expired',
          },
        ],
      },
    ],
  })
  results!: Array<{
    userId: string;
    successCount: number;
    failureCount: number;
    responses: any[];
  }>;
}
