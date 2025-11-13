import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  filterUsersWithPushEnabled,
  getTokensMapForUsers,
  processSingleSuggestion,
} from '../../../shared/utils/push-notification.helpers';
import { SuggestionsService } from '../ai/suggestions.service';
import { FcmService } from '../fcm.service';
import { FcmCoreService } from '../fcm/fcm.core.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationsService } from './notifications.service';
import { SystemConfigService } from '../system/system-config.service';

export interface ScheduledNotification {
  id: string;
  userId: string;
  type:
    | 'medication_reminder'
    | 'health_check'
    | 'appointment'
    | 'caregiver_shift'
    | 'emergency_drill';
  title: string;
  body: string;
  data?: Record<string, any>;
  scheduledTime: Date;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number; // every N days/weeks/months
  };
  status: 'pending' | 'sent' | 'cancelled';
}

@Injectable()
export class PushNotificationScheduler {
  private readonly logger = new Logger(PushNotificationScheduler.name);
  constructor(
    private readonly _fcmService: FcmService,
    private readonly _fcmCoreService: FcmCoreService,
    private readonly _notificationPreferencesService: NotificationPreferencesService,
    private readonly _notificationsService: NotificationsService,
    private readonly _prisma: PrismaService,
    private readonly _suggestionsService: SuggestionsService,
    private readonly _systemConfig: SystemConfigService,
  ) {}

  /**
   * Send daily health check reminders - runs at 9 AM daily
   */
  @Cron('0 9 * * *')
  async sendDailyHealthCheckReminders() {
    this.logger.log('🏥 Sending daily health check reminders...');

    try {
      const userIds = await this._notificationPreferencesService.getUsersWithHealthCheckReminders();
      const filteredUserIds = await filterUsersWithPushEnabled(
        this._notificationPreferencesService,
        userIds,
        this.logger,
      );
      if (filteredUserIds.length === 0) {
        this.logger.log('✅ No users to notify for health check');
        return;
      }
      const tokensMap = await getTokensMapForUsers(
        this._fcmCoreService,
        filteredUserIds,
        this.logger,
      );

      // Send per-user using token map (avoids re-querying DB inside fcmService.sendNotificationToUser)
      const title = '🏥 Daily Health Check';
      const body = 'Đừng quên kiểm tra sức khỏe người thân hôm nay';
      for (const uid of filteredUserIds) {
        const toks = tokensMap[uid] ?? [];
        if (!toks.length) continue;
        await this._fcmCoreService.sendMulticast(toks, {
          notification: { title, body },
          data: { type: 'health_check_reminder', date: new Date().toISOString().split('T')[0] },
        });
      }

      this.logger.log('✅ Daily health check reminders sent');
    } catch (error) {
      this.logger.error('❌ Error sending health check reminders:', error);
    }
  }

  /**
   * Send caregiver shift notifications - runs at 8 AM daily
   */
  @Cron('0 8 * * *')
  async sendCaregiverShiftNotifications() {
    this.logger.log('👨‍⚕️ Sending caregiver shift notifications...');

    try {
      // Get caregivers with shifts today
      const caregiversWithShifts = await this.getCaregiversWithShiftsToday();
      const userIds = caregiversWithShifts.map((c) => c.userId);
      const filteredUserIds = await filterUsersWithPushEnabled(
        this._notificationPreferencesService,
        userIds,
        this.logger,
      );
      if (filteredUserIds.length === 0) {
        this.logger.log('✅ No caregivers to notify for shifts');
        return;
      }
      const tokensMap = await getTokensMapForUsers(
        this._fcmCoreService,
        filteredUserIds,
        this.logger,
      );

      const title = '👨‍⚕️ Nhắc ca làm của Caregiver';
      for (const caregiver of caregiversWithShifts) {
        const uid = caregiver.userId;
        const toks = tokensMap[uid] ?? [];
        if (!toks.length) continue;
        await this._fcmCoreService.sendMulticast(toks, {
          notification: {
            title,
            body: `Ca của bạn bắt đầu lúc ${caregiver.shiftStartTime} cho ${caregiver.patientName}`,
          },
          data: {
            type: 'caregiver_shift',
            shiftId: caregiver.shiftId,
            patientId: caregiver.patientId,
          },
        });
      }

      this.logger.log('✅ Caregiver shift notifications sent');
    } catch (error) {
      this.logger.error('❌ Error sending caregiver shift notifications:', error);
    }
  }

  /**
   * Gửi thông báo tập huấn khẩn cấp - chạy hàng tháng vào ngày 1
   */
  @Cron('0 10 1 * *')
  async sendEmergencyDrillNotifications() {
    this.logger.log('🚨 Sending emergency drill notifications...');

    try {
      const userIds =
        await this._notificationPreferencesService.getUsersWithEmergencyDrillReminders();
      const filteredUserIds = await filterUsersWithPushEnabled(
        this._notificationPreferencesService,
        userIds,
        this.logger,
      );
      if (filteredUserIds.length === 0) {
        this.logger.log('✅ No users to notify for emergency drill');
        return;
      }
      const tokensMap = await getTokensMapForUsers(
        this._fcmCoreService,
        filteredUserIds,
        this.logger,
      );

      const title = '🚨 Nhắc tập huấn khẩn cấp';
      for (const uid of filteredUserIds) {
        const toks = tokensMap[uid] ?? [];
        if (!toks.length) continue;
        await this._fcmCoreService.sendMulticast(toks, {
          notification: { title, body: 'Đã đến lúc kiểm tra sẵn sàng khẩn cấp hàng tháng' },
          data: { type: 'emergency_drill', drillType: 'monthly_check' },
        });
      }

      this.logger.log('✅ Emergency drill notifications sent');
    } catch (error) {
      this.logger.error('❌ Error sending emergency drill notifications:', error);
    }
  }

  /**
   * Send appointment reminders - runs every 30 minutes
   */
  @Cron('*/30 * * * *')
  async sendAppointmentReminders() {
    this.logger.log('📅 Kiểm tra nhắc lịch hẹn...');

    try {
      const upcomingAppointments = await this.getUpcomingAppointments(30);
      const userIds = upcomingAppointments.map((a) => a.userId);
      const filteredUserIds = await filterUsersWithPushEnabled(
        this._notificationPreferencesService,
        userIds,
        this.logger,
      );
      if (filteredUserIds.length === 0) {
        this.logger.log('✅ No appointment reminders to send');
        return;
      }
      const tokensMap = await getTokensMapForUsers(
        this._fcmCoreService,
        filteredUserIds,
        this.logger,
      );

      for (const appointment of upcomingAppointments) {
        const uid = appointment.userId;
        const toks = tokensMap[uid] ?? [];
        if (!toks.length) continue;
        const minutesUntil = Math.round(
          (appointment.scheduledTime.getTime() - Date.now()) / (1000 * 60),
        );
        await this._fcmCoreService.sendMulticast(toks, {
          notification: {
            title: '📅 Nhắc lịch hẹn',
            body: `${appointment.title} trong ${minutesUntil} phút`,
          },
          data: {
            type: 'appointment_reminder',
            appointmentId: appointment.id,
            scheduledTime: appointment.scheduledTime.toISOString(),
          },
        });
      }

      this.logger.log('✅ Appointment reminders sent');
    } catch (error) {
      this.logger.error('❌ Error sending appointment reminders:', error);
    }
  }

  /**
   * Send suggestion notifications. Runs every 10 minutes.
   * - Reads suggestions with next_notify_at <= now
   * - Respects per-user mutes stored in user_preferences (category='suggestions')
   *   precedence: mute:all > mute:type:<type> > item.skip_until
   * - Uses collapseKey suggestion:item:<id> to de-dupe FCM messages
   */
  @Cron('*/10 * * * *')
  async sendSuggestionNotifications() {
    this.logger.log('💡 Running suggestion notification scheduler...');
    try {
      const now = new Date();

      // fetch up to 200 due notifications to avoid long-running loops
      const due = await this._prisma.suggestions.findMany({
        where: { next_notify_at: { lte: now } },
        take: 200,
      });
      if (!due || due.length === 0) return this.logger.debug('No suggestion notifications due');

      // Prepare userIds and tokens in bulk
      const userIds = Array.from(
        new Set(due.map((d) => d.user_id).filter((id): id is string => !!id)),
      );
      if (userIds.length === 0) return;

      const { map: tokensMap } = await this._fcmCoreService.getAudienceTokensGroupedByUser(userIds);

      // Fetch suggestion-related preferences once for all users (keys start with 'mute')
      const rawPrefs = await this._prisma.user_preferences.findMany({
        where: {
          user_id: { in: userIds },
          category: 'suggestions',
          setting_key: { startsWith: 'mute' },
        },
      });

      const prefsMap: Record<string, Record<string, any>> = {};
      for (const p of rawPrefs) {
        if (!p.user_id) continue;
        prefsMap[p.user_id] = prefsMap[p.user_id] ?? {};
        prefsMap[p.user_id][p.setting_key] = p;
      }

      const cfgRem = await this._systemConfig
        .getInt('suggestions.reminder_interval_hours')
        .catch(() => null);
      const reminderHours =
        cfgRem ?? Number(process.env.SUGGESTIONS_REMINDER_INTERVAL_HOURS ?? '48');

      // Process due suggestions sequentially using shared helper
      const deps = {
        suggestionsService: this._suggestionsService,
        notificationsService: this._notificationsService,
        fcmCoreService: this._fcmCoreService,
        prisma: this._prisma,
        logger: this.logger,
      };
      for (const s of due) {
        await processSingleSuggestion(s, prefsMap, tokensMap, reminderHours, now, deps);
      }
    } catch (err) {
      this.logger.error('❌ Error in suggestion scheduler:', err);
    }
  }

  /**
   * Send fall detection alerts immediately (not scheduled)
   */
  async sendFallDetectionAlert(userId: string, eventData: any) {
    try {
      const preferences = await this._notificationPreferencesService.getPreferences(userId, userId);
      if (preferences.fall_detection_enabled) {
        await this._fcmService.sendNotificationToUser(
          userId,
          '🚨 Phát hiện té ngã!',
          'Phát hiện khả năng té ngã — vui lòng kiểm tra ngay',
          {
            type: 'fall_detection',
            eventId: eventData.eventId,
            cameraId: eventData.cameraId,
            timestamp: eventData.timestamp,
            priority: 'high',
          },
        );

        // Also send to emergency contacts if configured
        const emergencyContacts = await this.getEmergencyContacts(userId);
        for (const contact of emergencyContacts) {
          if (contact.pushEnabled) {
            await this._fcmService.sendNotificationToUser(
              contact.userId,
              '🚨 Cảnh báo khẩn cấp',
              `Phát hiện té ngã cho ${eventData.patientName ?? 'người thân của bạn'}`,
              {
                type: 'emergency_fall_alert',
                eventId: eventData.eventId,
                patientId: userId,
                priority: 'high',
              },
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('❌ Error sending fall detection alert:', error);
    }
  }

  /**
   * Send system maintenance notifications
   */
  async sendSystemMaintenanceNotification(userIds: string[], maintenanceData: any) {
    try {
      for (const userId of userIds) {
        const preferences = await this._notificationPreferencesService.getPreferences(
          userId,
          userId,
        );
        if (preferences.system_events_enabled) {
          await this._fcmService.sendNotificationToUser(
            userId,
            '🔧 Bảo trì hệ thống',
            maintenanceData.message,
            {
              type: 'system_maintenance',
              maintenanceId: maintenanceData.id,
              scheduledTime: maintenanceData.scheduledTime,
            },
          );
        }
      }
    } catch (error) {
      this.logger.error('❌ Error sending system maintenance notification:', error);
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

  // getDueMedications removed because medications are no longer stored under patient_medical_histories

  private async getCaregiversWithShiftsToday(): Promise<any[]> {
    // Try to query a caregiver shifts table if it exists. Accept multiple possible table names.
    const candidateTables = ['caregiver_shifts', 'shifts', 'shift_schedules', 'caregiver_shift'];
    try {
      for (const t of candidateTables) {
        // check table existence
        const exists: any = await this._prisma.$queryRawUnsafe(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${t}'`,
        );
        if (exists && exists.length > 0) {
          // Attempt to select today's shifts. Expect common columns; adapt safely.
          const rows: any[] = await this._prisma.$queryRawUnsafe(
            `SELECT user_id, id as shift_id, patient_id, patient_name, shift_start_time FROM ${t} WHERE date(shift_start_time) = current_date AND is_deleted IS NOT TRUE`,
          );
          if (rows && rows.length) {
            return rows.map((r) => ({
              userId: r.user_id,
              shiftId: r.shift_id || r.shift_id,
              patientId: r.patient_id,
              patientName: r.patient_name || r.patientname || 'Bệnh nhân',
              shiftStartTime: r.shift_start_time ? String(r.shift_start_time) : '09:00',
            }));
          }
        }
      }
    } catch (err) {
      this.logger.warn('Lỗi khi truy vấn ca làm thực tế:', err);
    }

    // Fallback: no real shifts table found or empty -> return empty list (previous mock removed)
    return [];
  }

  private async getUpcomingAppointments(minutesAhead: number): Promise<any[]> {
    // Try to query an appointments table if present. If not present, return empty array.
    try {
      // Check if table exists using information_schema instead of to_regclass
      const exists: any = await this._prisma.$queryRawUnsafe(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments'`,
      );
      if (exists && exists.length > 0) {
        const rows: any[] = await this._prisma.$queryRawUnsafe(
          `SELECT id, user_id, title, scheduled_time FROM appointments WHERE scheduled_time BETWEEN now() AND (now() + interval '${minutesAhead} minutes') AND (is_deleted IS NOT TRUE OR is_deleted IS NULL)`,
        );
        return (rows || []).map((r) => ({
          id: r.id,
          userId: r.user_id,
          title: r.title || 'Cuộc hẹn',
          scheduledTime: new Date(r.scheduled_time),
        }));
      }
    } catch (err) {
      this.logger.warn('Lỗi khi truy vấn appointments:', err);
    }

    return [];
  }

  private async getEmergencyContacts(_userId: string): Promise<any[]> {
    try {
      const contacts = await this._prisma.emergency_contacts.findMany({
        where: { user_id: _userId, is_deleted: false },
        select: { id: true, user_id: true, name: true, phone: true },
      });
      return (contacts || []).map((c: any) => ({
        userId: c.user_id,
        pushEnabled: true,
        id: c.id,
        name: c.name,
        phone: c.phone,
      }));
    } catch (err) {
      this.logger.warn('Lỗi khi lấy emergency contacts:', err);
      return [];
    }
  }
}
