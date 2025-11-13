/**
 * Notification Category Enums
 * Tập trung tất cả các loại notification trong hệ thống
 */

/**
 * Nguồn gốc của notification
 */
export enum NotificationSource {
  SYSTEM = 'system',
  USER = 'user',
  AI = 'ai',
  ADMIN = 'admin',
}

/**
 * Loại notification từ SYSTEM
 */
export enum SystemNotificationType {
  // AI Detection Events
  FALL_DETECTION = 'fall_detection',
  ABNORMAL_BEHAVIOR = 'abnormal_behavior',
  EMERGENCY = 'emergency',
  INACTIVITY = 'inactivity',
  INTRUSION = 'intrusion',
  MEDICATION_REMINDER = 'medication_reminder',

  // System Maintenance
  SYSTEM_MAINTENANCE = 'system_maintenance',
  DEVICE_OFFLINE = 'device_offline',
  QUOTA_EXCEEDED = 'quota_exceeded',

  // License & Payment
  SUBSCRIPTION_EXPIRY = 'subscription_expiry',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  INVOICE_GENERATED = 'invoice_generated',

  // Scheduled Reminders
  HEALTH_CHECK_REMINDER = 'health_check_reminder',
  CAREGIVER_SHIFT = 'caregiver_shift',
  EMERGENCY_DRILL = 'emergency_drill',
  APPOINTMENT_REMINDER = 'appointment_reminder',
}

/**
 * Loại notification từ USER (caregiver <-> customer)
 */
export enum UserNotificationType {
  // Actor Messages
  ACTOR_MESSAGE_HELP = 'actor_message_help',
  ACTOR_MESSAGE_REMINDER = 'actor_message_reminder',
  ACTOR_MESSAGE_REPORT = 'actor_message_report',
  ACTOR_MESSAGE_CONFIRM = 'actor_message_confirm',

  // Caregiver Invitations
  CAREGIVER_INVITATION_SENT = 'caregiver_invitation_sent',
  CAREGIVER_INVITATION_ACCEPTED = 'caregiver_invitation_accepted',
  CAREGIVER_INVITATION_REJECTED = 'caregiver_invitation_rejected',
  CAREGIVER_UNASSIGNED = 'caregiver_unassigned',

  // Shared Permissions
  PERMISSION_REQUEST = 'permission_request',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
  PERMISSION_UPDATED = 'permission_updated',

  // Event Update Approval (NEW)
  EVENT_UPDATE_REQUESTED = 'event_update_requested',
  EVENT_UPDATE_APPROVED = 'event_update_approved',
  EVENT_UPDATE_REJECTED = 'event_update_rejected',
}

/**
 * Kênh gửi notification
 */
export enum NotificationChannel {
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
  WEBHOOK = 'webhook',
}

/**
 * Mức độ ưu tiên của notification
 */
export enum NotificationPriority {
  CRITICAL = 'critical', // Emergency, fall detection
  HIGH = 'high', // Important alerts
  MEDIUM = 'medium', // Standard notifications
  LOW = 'low', // Informational
}

/**
 * Trạng thái của notification
 */
export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

/**
 * Helper functions
 */

/**
 * Lấy priority dựa trên notification type
 */
export function getNotificationPriority(
  type: SystemNotificationType | UserNotificationType,
): NotificationPriority {
  const criticalTypes = [
    SystemNotificationType.FALL_DETECTION,
    SystemNotificationType.EMERGENCY,
    SystemNotificationType.DEVICE_OFFLINE,
    UserNotificationType.ACTOR_MESSAGE_HELP,
  ];

  const highTypes = [
    SystemNotificationType.ABNORMAL_BEHAVIOR,
    SystemNotificationType.INTRUSION,
    SystemNotificationType.PAYMENT_FAILED,
    UserNotificationType.PERMISSION_REQUEST,
    UserNotificationType.EVENT_UPDATE_REQUESTED,
  ];

  const lowTypes = [
    SystemNotificationType.HEALTH_CHECK_REMINDER,
    SystemNotificationType.APPOINTMENT_REMINDER,
    UserNotificationType.ACTOR_MESSAGE_REMINDER,
  ];

  if (criticalTypes.includes(type as any)) return NotificationPriority.CRITICAL;
  if (highTypes.includes(type as any)) return NotificationPriority.HIGH;
  if (lowTypes.includes(type as any)) return NotificationPriority.LOW;
  return NotificationPriority.MEDIUM;
}

/**
 * Lấy source dựa trên notification type
 */
export function getNotificationSource(
  type: SystemNotificationType | UserNotificationType,
): NotificationSource {
  const systemTypes = Object.values(SystemNotificationType);
  const userTypes = Object.values(UserNotificationType);

  if (systemTypes.includes(type as SystemNotificationType)) {
    // AI detection types
    if (
      [
        SystemNotificationType.FALL_DETECTION,
        SystemNotificationType.ABNORMAL_BEHAVIOR,
        SystemNotificationType.EMERGENCY,
        SystemNotificationType.INACTIVITY,
        SystemNotificationType.INTRUSION,
      ].includes(type as SystemNotificationType)
    ) {
      return NotificationSource.AI;
    }
    return NotificationSource.SYSTEM;
  }

  if (userTypes.includes(type as UserNotificationType)) {
    return NotificationSource.USER;
  }

  return NotificationSource.SYSTEM;
}

/**
 * Lấy default channel dựa trên notification type
 */
export function getDefaultChannel(
  type: SystemNotificationType | UserNotificationType,
): NotificationChannel {
  const priority = getNotificationPriority(type);

  if (priority === NotificationPriority.CRITICAL) {
    return NotificationChannel.PUSH; // Critical alerts go via push
  }

  if (priority === NotificationPriority.HIGH) {
    return NotificationChannel.PUSH;
  }

  // Medium and low priority can use in-app
  return NotificationChannel.IN_APP;
}

/**
 * Format notification title dựa trên type
 */
export function getNotificationTitle(type: SystemNotificationType | UserNotificationType): string {
  const titles: Record<string, string> = {
    // System notifications
    [SystemNotificationType.FALL_DETECTION]: '🚨 Phát hiện ngã',
    [SystemNotificationType.ABNORMAL_BEHAVIOR]: '⚠️ Hành vi bất thường',
    [SystemNotificationType.EMERGENCY]: '🆘 Khẩn cấp',
    [SystemNotificationType.INACTIVITY]: '😴 Không có hoạt động',
    [SystemNotificationType.INTRUSION]: '🚪 Phát hiện người lạ',
    [SystemNotificationType.MEDICATION_REMINDER]: '💊 Nhắc uống thuốc',
    [SystemNotificationType.SYSTEM_MAINTENANCE]: '🔧 Bảo trì hệ thống',
    [SystemNotificationType.DEVICE_OFFLINE]: '📵 Thiết bị offline',
    [SystemNotificationType.QUOTA_EXCEEDED]: '📊 Vượt quá hạn mức',
    [SystemNotificationType.SUBSCRIPTION_EXPIRY]: '⏰ Gia hạn đăng ký',
    [SystemNotificationType.PAYMENT_SUCCESS]: '✅ Thanh toán thành công',
    [SystemNotificationType.PAYMENT_FAILED]: '❌ Thanh toán thất bại',
    [SystemNotificationType.INVOICE_GENERATED]: '🧾 Hóa đơn mới',
    [SystemNotificationType.HEALTH_CHECK_REMINDER]: '🏥 Nhắc kiểm tra sức khỏe',
    [SystemNotificationType.CAREGIVER_SHIFT]: '👨‍⚕️ Ca làm việc',
    [SystemNotificationType.EMERGENCY_DRILL]: '🚨 Diễn tập khẩn cấp',
    [SystemNotificationType.APPOINTMENT_REMINDER]: '📅 Nhắc lịch hẹn',

    // User notifications
    [UserNotificationType.ACTOR_MESSAGE_HELP]: '🆘 Yêu cầu trợ giúp',
    [UserNotificationType.ACTOR_MESSAGE_REMINDER]: '⏰ Nhắc nhở',
    [UserNotificationType.ACTOR_MESSAGE_REPORT]: '📝 Báo cáo',
    [UserNotificationType.ACTOR_MESSAGE_CONFIRM]: '✅ Xác nhận',
    [UserNotificationType.CAREGIVER_INVITATION_SENT]: '📨 Lời mời chăm sóc',
    [UserNotificationType.CAREGIVER_INVITATION_ACCEPTED]: '✅ Chấp nhận lời mời',
    [UserNotificationType.CAREGIVER_INVITATION_REJECTED]: '❌ Từ chối lời mời',
    [UserNotificationType.CAREGIVER_UNASSIGNED]: '🔓 Hủy phân công',
    [UserNotificationType.PERMISSION_REQUEST]: '🔐 Yêu cầu quyền truy cập',
    [UserNotificationType.PERMISSION_GRANTED]: '✅ Cấp quyền truy cập',
    [UserNotificationType.PERMISSION_REVOKED]: '🔒 Thu hồi quyền truy cập',
    [UserNotificationType.PERMISSION_UPDATED]: '🔄 Cập nhật quyền truy cập',
    [UserNotificationType.EVENT_UPDATE_REQUESTED]: '📝 Yêu cầu cập nhật sự kiện',
    [UserNotificationType.EVENT_UPDATE_APPROVED]: '✅ Phê duyệt cập nhật',
    [UserNotificationType.EVENT_UPDATE_REJECTED]: '❌ Từ chối cập nhật',
  };

  return titles[type] || '📬 Thông báo mới';
}
