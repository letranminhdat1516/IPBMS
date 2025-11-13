/**
 * @deprecated This file is kept for backwards compatibility only.
 * The 'alerts' model has been merged into 'notifications' model.
 *
 * Please use 'notifications' model instead:
 * - In Prisma: model notifications { ... }
 * - Alert-related fields are now part of notifications (event_id, severity, acknowledged_by, etc.)
 *
 * If you need Alert-related enums or types, they are now in notifications.entity.ts
 */

// Re-export common enums for backwards compatibility
export enum AlertTypeEnum {
  emergency = 'emergency',
  warning = 'warning',
  info = 'info',
  medication_reminder = 'medication_reminder',
  habit_deviation = 'habit_deviation',
}

export enum AlertStatusEnum {
  active = 'active',
  acknowledged = 'acknowledged',
  resolved = 'resolved',
  dismissed = 'dismissed',
}

export enum SeverityEnum {
  critical = 'critical',
  high = 'high',
  medium = 'medium',
  low = 'low',
}

/**
 * @deprecated Use Notification entity from notifications.entity.ts instead
 * This class is kept for backwards compatibility but should not be used in new code.
 */
export class Alert {
  alert_id!: string;
  event_id!: string;
  user_id!: string;
  alert_type?: string;
  severity?: string;
  alert_message?: string;
  alert_data?: object;
  status?: string;
  acknowledged_by?: string;
  acknowledged_at?: Date;
  resolution_notes?: string;
  created_at!: Date;
  resolved_at?: Date;

  get notification_id(): string {
    return this.alert_id;
  }
}
