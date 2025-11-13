import { Injectable, Logger } from '@nestjs/common';
import { TwilioVoiceService } from '../../../infrastructure/external-apis/twilio/twilio-voice.service';
import { FcmService } from '../fcm.service';
import { FallDetectionRepository } from '../../../infrastructure/repositories/ai/fall-detection.repository';

export type FallHandleInput = {
  userId: string;
  eventId: string;
};

type ContactRow = {
  id: string;
  name: string;
  phone: string;
  alert_level: number | null;
};

@Injectable()
export class FallDetectionService {
  private readonly logger = new Logger(FallDetectionService.name);

  constructor(
    private readonly repo: FallDetectionRepository,
    private readonly voice: TwilioVoiceService,
    private readonly fcmService: FcmService,
  ) {}

  async getFallDetectionSettings(): Promise<{
    enabled: boolean;
    abnormal_unconfirmed_streak: number;
    abnormal_streak_window_minutes: number;
    only_trigger_if_unconfirmed: boolean;
  }> {
    const settings = await this.repo.getSettings();

    const map = settings.reduce((acc: Record<string, string>, s: any) => {
      acc[s.setting_key] = s.setting_value;
      return acc;
    }, {});

    return {
      enabled: map['fall_detection_enabled'] === 'true',
      abnormal_unconfirmed_streak: parseInt(map['abnormal_unconfirmed_streak'] ?? '5', 10),
      abnormal_streak_window_minutes: parseInt(map['abnormal_streak_window_minutes'] ?? '30', 10),
      only_trigger_if_unconfirmed: map['only_trigger_if_unconfirmed'] === 'true',
    };
  }

  async hasUnhandledAbnormalStreak(userId: string): Promise<boolean> {
    const cfg = await this.getFallDetectionSettings();
    if (!cfg.enabled) return false;

    const {
      abnormal_unconfirmed_streak,
      abnormal_streak_window_minutes,
      only_trigger_if_unconfirmed,
    } = cfg;

    const since = new Date();
    since.setMinutes(since.getMinutes() - abnormal_streak_window_minutes);

    const events = await this.repo.findRecentAbnormalEvents(
      userId,
      since,
      abnormal_unconfirmed_streak,
    );

    if (events.length < abnormal_unconfirmed_streak) return false;

    return events.every((e) => (only_trigger_if_unconfirmed ? e.confirm_status !== true : true));
  }

  async isCallSuppressed(userId: string): Promise<boolean> {
    const supplement = await this.repo.findSupplement(userId);
    return (
      !!supplement?.call_confirmed_until && new Date(supplement.call_confirmed_until) > new Date()
    );
  }

  async getEmergencyContacts(userId: string): Promise<ContactRow[]> {
    return this.repo.findEmergencyContacts(userId);
  }

  async createAlert(userId: string, eventId: string, message: string) {
    try {
      const alert = await this.repo.createAlert(userId, eventId, message);
      return alert.notification_id;
    } catch (err) {
      this.logger.error(`❌ Lỗi tạo alert`, err);
      return undefined;
    }
  }

  async callFirstContact(userId: string, alertId: string) {
    const contacts = await this.repo.findEmergencyContacts(userId);
    if (!contacts.length) return false;

    const msg =
      'Hệ thống phát hiện chuỗi hành vi bất thường chưa được xác nhận. Vui lòng kiểm tra người thân ngay.';
    for (const c of contacts) {
      if (!c.phone) continue;
      const ok = await this.voice.callEmergencyVn(c.phone, msg);
      if (ok) return true;
    }
    return false;
  }

  async handle(input: FallHandleInput) {
    const { userId, eventId } = input;

    const thresholdReached = await this.hasUnhandledAbnormalStreak(userId);
    if (!thresholdReached) return { thresholdReached: false, alerted: false };

    if (await this.isCallSuppressed(userId)) {
      this.logger.warn(`📵 User ${userId} đã suppress gọi điện`);
      return { thresholdReached: true, alerted: false };
    }

    const alertId = await this.createAlert(
      userId,
      eventId,
      `Phát hiện chuỗi abnormal_behavior chưa confirm. Đã vượt ngưỡng cấu hình.`,
    );

    if (alertId) {
      try {
        await this.fcmService.pushSystemEvent(userId, {
          eventId,
          eventType: 'fall_detection',
          title: 'Cảnh báo hành vi bất thường',
          body: 'Hệ thống phát hiện chuỗi hành vi bất thường chưa được xác nhận.',
          deeplink: `detectcare://alert/${alertId}`,
          extra: { alertId },
        });
      } catch (err) {
        this.logger.error(`❌ Lỗi gửi FCM cho user ${userId}`, err);
      }
    }

    const alerted = alertId ? await this.callFirstContact(userId, alertId) : false;

    if (alertId) {
      await this.repo.markEventAsNormal(eventId);
    }

    return { thresholdReached: true, alerted, alertId };
  }

  async findUsersWithRecentAbnormalEvents() {
    const { abnormal_streak_window_minutes } = await this.getFallDetectionSettings();

    const since = new Date();
    since.setMinutes(since.getMinutes() - abnormal_streak_window_minutes);

    return this.repo.findUsersWithRecentAbnormalEvents(since);
  }

  async findLatestAbnormalEvent(userId: string) {
    return this.repo.findLatestAbnormalEvent(userId);
  }
}
