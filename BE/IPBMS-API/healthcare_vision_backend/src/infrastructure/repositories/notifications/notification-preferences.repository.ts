import { Injectable } from '@nestjs/common';
import { NotificationPreference } from '../../../core/entities/notification-preferences.entity';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

@Injectable()
export class NotificationPreferencesRepository extends BasePrismaRepository {
  private readonly NOTIFICATION_CATEGORY = 'notification';

  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async getByUserId(userId: string): Promise<NotificationPreference | null> {
    const settings = await this.prisma.user_preferences.findMany({
      where: {
        user_id: userId,
        category: this.NOTIFICATION_CATEGORY,
      },
    });

    if (settings.length === 0) {
      return null;
    }

    return this.settingsToNotificationPreference(userId, settings);
  }

  async createDefault(userId: string, defaults?: any): Promise<NotificationPreference> {
    const defaultSettings = [
      {
        setting_key: 'system_events_enabled',
        setting_value: (defaults?.system_events_enabled ?? true).toString(),
        is_enabled: defaults?.system_events_enabled ?? true,
      },
      {
        setting_key: 'actor_messages_enabled',
        setting_value: (defaults?.actor_messages_enabled ?? true).toString(),
        is_enabled: defaults?.actor_messages_enabled ?? true,
      },
      {
        setting_key: 'push_notifications_enabled',
        setting_value: (defaults?.push_notifications_enabled ?? true).toString(),
        is_enabled: defaults?.push_notifications_enabled ?? true,
      },
      {
        setting_key: 'email_notifications_enabled',
        setting_value: (defaults?.email_notifications_enabled ?? true).toString(),
        is_enabled: defaults?.email_notifications_enabled ?? true,
      },
      {
        setting_key: 'fall_detection_enabled',
        setting_value: (defaults?.fall_detection_enabled ?? true).toString(),
        is_enabled: defaults?.fall_detection_enabled ?? true,
      },
      {
        setting_key: 'seizure_detection_enabled',
        setting_value: (defaults?.seizure_detection_enabled ?? true).toString(),
        is_enabled: defaults?.seizure_detection_enabled ?? true,
      },
      {
        setting_key: 'abnormal_behavior_enabled',
        setting_value: (defaults?.abnormal_behavior_enabled ?? true).toString(),
        is_enabled: defaults?.abnormal_behavior_enabled ?? true,
      },
      // Additional system notification preferences
      {
        setting_key: 'emergency_enabled',
        setting_value: (defaults?.emergency_enabled ?? true).toString(),
        is_enabled: defaults?.emergency_enabled ?? true,
      },
      {
        setting_key: 'device_offline_enabled',
        setting_value: (defaults?.device_offline_enabled ?? true).toString(),
        is_enabled: defaults?.device_offline_enabled ?? true,
      },
      {
        setting_key: 'payment_failed_enabled',
        setting_value: (defaults?.payment_failed_enabled ?? true).toString(),
        is_enabled: defaults?.payment_failed_enabled ?? true,
      },
      {
        setting_key: 'subscription_expiry_enabled',
        setting_value: (defaults?.subscription_expiry_enabled ?? true).toString(),
        is_enabled: defaults?.subscription_expiry_enabled ?? true,
      },
      {
        setting_key: 'health_check_reminder_enabled',
        setting_value: (defaults?.health_check_reminder_enabled ?? true).toString(),
        is_enabled: defaults?.health_check_reminder_enabled ?? true,
      },
      {
        setting_key: 'appointment_reminder_enabled',
        setting_value: (defaults?.appointment_reminder_enabled ?? true).toString(),
        is_enabled: defaults?.appointment_reminder_enabled ?? true,
      },
      // User notification preferences
      {
        setting_key: 'permission_request_enabled',
        setting_value: (defaults?.permission_request_enabled ?? true).toString(),
        is_enabled: defaults?.permission_request_enabled ?? true,
      },
      {
        setting_key: 'event_update_enabled',
        setting_value: (defaults?.event_update_enabled ?? true).toString(),
        is_enabled: defaults?.event_update_enabled ?? true,
      },
      {
        setting_key: 'caregiver_invitation_enabled',
        setting_value: (defaults?.caregiver_invitation_enabled ?? true).toString(),
        is_enabled: defaults?.caregiver_invitation_enabled ?? true,
      },
      // Ticket notification preferences
      {
        setting_key: 'ticket_created_enabled',
        setting_value: (defaults?.ticket_created_enabled ?? true).toString(),
        is_enabled: defaults?.ticket_created_enabled ?? true,
      },
      {
        setting_key: 'ticket_assigned_enabled',
        setting_value: (defaults?.ticket_assigned_enabled ?? true).toString(),
        is_enabled: defaults?.ticket_assigned_enabled ?? true,
      },
      {
        setting_key: 'ticket_status_changed_enabled',
        setting_value: (defaults?.ticket_status_changed_enabled ?? true).toString(),
        is_enabled: defaults?.ticket_status_changed_enabled ?? true,
      },
      {
        setting_key: 'ticket_message_enabled',
        setting_value: (defaults?.ticket_message_enabled ?? true).toString(),
        is_enabled: defaults?.ticket_message_enabled ?? true,
      },
      {
        setting_key: 'ticket_rated_enabled',
        setting_value: (defaults?.ticket_rated_enabled ?? true).toString(),
        is_enabled: defaults?.ticket_rated_enabled ?? true,
      },
      {
        setting_key: 'ticket_closed_enabled',
        setting_value: (defaults?.ticket_closed_enabled ?? true).toString(),
        is_enabled: defaults?.ticket_closed_enabled ?? true,
      },
    ];

    // Upsert each default setting to make creation idempotent and avoid race conditions
    const upsertPromises = defaultSettings.map((setting) =>
      this.upsertSetting(userId, setting.setting_key, setting.setting_value, setting.is_enabled),
    );

    await Promise.all(upsertPromises);

    const createdSettings = await this.prisma.user_preferences.findMany({
      where: {
        user_id: userId,
        category: this.NOTIFICATION_CATEGORY,
      },
    });

    return this.settingsToNotificationPreference(userId, createdSettings);
  }

  async upsert(
    userId: string,
    data: Partial<NotificationPreference>,
  ): Promise<NotificationPreference> {
    const updates = [];

    // Handle each preference field
    if (data.system_events_enabled !== undefined) {
      updates.push(
        this.upsertSetting(
          userId,
          'system_events_enabled',
          data.system_events_enabled.toString(),
          data.system_events_enabled,
        ),
      );
    }
    if (data.actor_messages_enabled !== undefined) {
      updates.push(
        this.upsertSetting(
          userId,
          'actor_messages_enabled',
          data.actor_messages_enabled.toString(),
          data.actor_messages_enabled,
        ),
      );
    }
    if (data.push_notifications_enabled !== undefined) {
      updates.push(
        this.upsertSetting(
          userId,
          'push_notifications_enabled',
          data.push_notifications_enabled.toString(),
          data.push_notifications_enabled,
        ),
      );
    }
    if (data.email_notifications_enabled !== undefined) {
      updates.push(
        this.upsertSetting(
          userId,
          'email_notifications_enabled',
          data.email_notifications_enabled.toString(),
          data.email_notifications_enabled,
        ),
      );
    }
    if (data.quiet_hours_start !== undefined) {
      updates.push(
        this.upsertSetting(userId, 'quiet_hours_start', data.quiet_hours_start || '', true),
      );
    }
    if (data.quiet_hours_end !== undefined) {
      updates.push(this.upsertSetting(userId, 'quiet_hours_end', data.quiet_hours_end || '', true));
    }
    if (data.fall_detection_enabled !== undefined) {
      updates.push(
        this.upsertSetting(
          userId,
          'fall_detection_enabled',
          data.fall_detection_enabled.toString(),
          data.fall_detection_enabled,
        ),
      );
    }
    if (data.seizure_detection_enabled !== undefined) {
      updates.push(
        this.upsertSetting(
          userId,
          'seizure_detection_enabled',
          data.seizure_detection_enabled.toString(),
          data.seizure_detection_enabled,
        ),
      );
    }
    if (data.abnormal_behavior_enabled !== undefined) {
      updates.push(
        this.upsertSetting(
          userId,
          'abnormal_behavior_enabled',
          data.abnormal_behavior_enabled.toString(),
          data.abnormal_behavior_enabled,
        ),
      );
    }

    await Promise.all(updates);

    return this.getByUserId(userId) as Promise<NotificationPreference>;
  }

  async createDefaultNotificationPreference(userId: string): Promise<NotificationPreference> {
    const defaultSettings = [
      { setting_key: 'system_events_enabled', setting_value: 'true', is_enabled: true },
      { setting_key: 'actor_messages_enabled', setting_value: 'true', is_enabled: true },
      { setting_key: 'push_notifications_enabled', setting_value: 'true', is_enabled: true },
      { setting_key: 'email_notifications_enabled', setting_value: 'true', is_enabled: true },
      { setting_key: 'fall_detection_enabled', setting_value: 'true', is_enabled: true },
      { setting_key: 'seizure_detection_enabled', setting_value: 'true', is_enabled: true },
      { setting_key: 'abnormal_behavior_enabled', setting_value: 'true', is_enabled: true },
    ];

    await this.prisma.user_preferences.createMany({
      data: defaultSettings.map((setting) => ({
        user_id: userId,
        category: this.NOTIFICATION_CATEGORY,
        ...setting,
      })),
    });

    const createdSettings = await this.prisma.user_preferences.findMany({
      where: {
        user_id: userId,
        category: this.NOTIFICATION_CATEGORY,
      },
    });

    return this.settingsToNotificationPreference(userId, createdSettings);
  }

  async upsertNotificationPreference(
    userId: string,
    data: Partial<NotificationPreference>,
  ): Promise<NotificationPreference> {
    const updates = [];

    // Handle each preference field
    if (data.system_events_enabled !== undefined) {
      updates.push(
        this.upsertSetting(
          userId,
          'system_events_enabled',
          data.system_events_enabled.toString(),
          data.system_events_enabled,
        ),
      );
    }
    if (data.actor_messages_enabled !== undefined) {
      updates.push(
        this.upsertSetting(
          userId,
          'actor_messages_enabled',
          data.actor_messages_enabled.toString(),
          data.actor_messages_enabled,
        ),
      );
    }
    if (data.push_notifications_enabled !== undefined) {
      updates.push(
        this.upsertSetting(
          userId,
          'push_notifications_enabled',
          data.push_notifications_enabled.toString(),
          data.push_notifications_enabled,
        ),
      );
    }
    if (data.email_notifications_enabled !== undefined) {
      updates.push(
        this.upsertSetting(
          userId,
          'email_notifications_enabled',
          data.email_notifications_enabled.toString(),
          data.email_notifications_enabled,
        ),
      );
    }
    if (data.quiet_hours_start !== undefined) {
      updates.push(
        this.upsertSetting(userId, 'quiet_hours_start', data.quiet_hours_start || '', true),
      );
    }
    if (data.quiet_hours_end !== undefined) {
      updates.push(this.upsertSetting(userId, 'quiet_hours_end', data.quiet_hours_end || '', true));
    }
    if (data.fall_detection_enabled !== undefined) {
      updates.push(
        this.upsertSetting(
          userId,
          'fall_detection_enabled',
          data.fall_detection_enabled.toString(),
          data.fall_detection_enabled,
        ),
      );
    }
    if (data.seizure_detection_enabled !== undefined) {
      updates.push(
        this.upsertSetting(
          userId,
          'seizure_detection_enabled',
          data.seizure_detection_enabled.toString(),
          data.seizure_detection_enabled,
        ),
      );
    }
    if (data.abnormal_behavior_enabled !== undefined) {
      updates.push(
        this.upsertSetting(
          userId,
          'abnormal_behavior_enabled',
          data.abnormal_behavior_enabled.toString(),
          data.abnormal_behavior_enabled,
        ),
      );
    }

    await Promise.all(updates);

    return this.getByUserId(userId) as Promise<NotificationPreference>;
  }

  async shouldSendNotification(
    userId: string,
    type: 'system' | 'actor' | 'push',
  ): Promise<boolean> {
    const preference = await this.getByUserId(userId);
    if (!preference) return true; // Default to true if no preference set

    // Check quiet hours
    if (preference.quiet_hours_start && preference.quiet_hours_end) {
      const now = new Date();
      const currentTime = now.getHours() * 100 + now.getMinutes();
      const startTime = this.timeToMinutes(preference.quiet_hours_start);
      const endTime = this.timeToMinutes(preference.quiet_hours_end);

      if (startTime < endTime) {
        // Same day quiet hours (e.g., 22:00 to 08:00)
        if (currentTime >= startTime && currentTime <= endTime) {
          return false;
        }
      } else {
        // Overnight quiet hours (e.g., 22:00 to 08:00 next day)
        if (currentTime >= startTime || currentTime <= endTime) {
          return false;
        }
      }
    }

    // Check notification type
    switch (type) {
      case 'system':
        return preference.system_events_enabled && preference.push_notifications_enabled;
      case 'actor':
        return preference.actor_messages_enabled && preference.push_notifications_enabled;
      case 'push':
        return preference.push_notifications_enabled;
      default:
        return true;
    }
  }

  async shouldSendEventType(userId: string, eventType: string): Promise<boolean> {
    const preference = await this.getByUserId(userId);
    if (!preference) return true;

    switch (eventType) {
      case 'fall':
        return preference.fall_detection_enabled;
      case 'seizure':
        return preference.seizure_detection_enabled;
      case 'abnormal':
        return preference.abnormal_behavior_enabled;
      default:
        return true;
    }
  }

  private async upsertSetting(
    userId: string,
    key: string,
    value: string,
    isEnabled: boolean,
  ): Promise<void> {
    await this.prisma.user_preferences.upsert({
      where: {
        user_id_category_setting_key: {
          user_id: userId,
          category: this.NOTIFICATION_CATEGORY,
          setting_key: key,
        },
      },
      update: {
        setting_value: value,
        is_enabled: isEnabled,
      },
      create: {
        user_id: userId,
        category: this.NOTIFICATION_CATEGORY,
        setting_key: key,
        setting_value: value,
        is_enabled: isEnabled,
      },
    });
  }

  private settingsToNotificationPreference(
    userId: string,
    settings: any[],
  ): NotificationPreference {
    const preference: NotificationPreference = {
      id: userId, // Use userId as id since it's a composite key
      user_id: userId,
      system_events_enabled: true,
      actor_messages_enabled: true,
      push_notifications_enabled: true,
      email_notifications_enabled: true,
      quiet_hours_start: null,
      quiet_hours_end: null,
      fall_detection_enabled: true,
      seizure_detection_enabled: true,
      abnormal_behavior_enabled: true,
      // Additional system notification preferences
      emergency_enabled: true,
      device_offline_enabled: true,
      payment_failed_enabled: true,
      subscription_expiry_enabled: true,
      health_check_reminder_enabled: true,
      appointment_reminder_enabled: true,
      // User notification preferences
      permission_request_enabled: true,
      event_update_enabled: true,
      caregiver_invitation_enabled: true,
      // Ticket notification preferences
      ticket_created_enabled: true,
      ticket_assigned_enabled: true,
      ticket_status_changed_enabled: true,
      ticket_message_enabled: true,
      ticket_rated_enabled: true,
      ticket_closed_enabled: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Map settings to preference object
    settings.forEach((setting) => {
      switch (setting.setting_key) {
        case 'system_events_enabled':
          preference.system_events_enabled = setting.setting_value === 'true';
          break;
        case 'actor_messages_enabled':
          preference.actor_messages_enabled = setting.setting_value === 'true';
          break;
        case 'push_notifications_enabled':
          preference.push_notifications_enabled = setting.setting_value === 'true';
          break;
        case 'email_notifications_enabled':
          preference.email_notifications_enabled = setting.setting_value === 'true';
          break;
        case 'quiet_hours_start':
          preference.quiet_hours_start = setting.setting_value || null;
          break;
        case 'quiet_hours_end':
          preference.quiet_hours_end = setting.setting_value || null;
          break;
        case 'fall_detection_enabled':
          preference.fall_detection_enabled = setting.setting_value === 'true';
          break;
        case 'seizure_detection_enabled':
          preference.seizure_detection_enabled = setting.setting_value === 'true';
          break;
        case 'abnormal_behavior_enabled':
          preference.abnormal_behavior_enabled = setting.setting_value === 'true';
          break;
        // Additional system notification preferences
        case 'emergency_enabled':
          preference.emergency_enabled = setting.setting_value === 'true';
          break;
        case 'device_offline_enabled':
          preference.device_offline_enabled = setting.setting_value === 'true';
          break;
        case 'payment_failed_enabled':
          preference.payment_failed_enabled = setting.setting_value === 'true';
          break;
        case 'subscription_expiry_enabled':
          preference.subscription_expiry_enabled = setting.setting_value === 'true';
          break;
        case 'health_check_reminder_enabled':
          preference.health_check_reminder_enabled = setting.setting_value === 'true';
          break;
        case 'appointment_reminder_enabled':
          preference.appointment_reminder_enabled = setting.setting_value === 'true';
          break;
        // User notification preferences
        case 'permission_request_enabled':
          preference.permission_request_enabled = setting.setting_value === 'true';
          break;
        case 'event_update_enabled':
          preference.event_update_enabled = setting.setting_value === 'true';
          break;
        case 'caregiver_invitation_enabled':
          preference.caregiver_invitation_enabled = setting.setting_value === 'true';
          break;
        // Ticket notification preferences
        case 'ticket_created_enabled':
          preference.ticket_created_enabled = setting.setting_value === 'true';
          break;
        case 'ticket_assigned_enabled':
          preference.ticket_assigned_enabled = setting.setting_value === 'true';
          break;
        case 'ticket_status_changed_enabled':
          preference.ticket_status_changed_enabled = setting.setting_value === 'true';
          break;
        case 'ticket_message_enabled':
          preference.ticket_message_enabled = setting.setting_value === 'true';
          break;
        case 'ticket_rated_enabled':
          preference.ticket_rated_enabled = setting.setting_value === 'true';
          break;
        case 'ticket_closed_enabled':
          preference.ticket_closed_enabled = setting.setting_value === 'true';
          break;
      }
    });

    return preference;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
