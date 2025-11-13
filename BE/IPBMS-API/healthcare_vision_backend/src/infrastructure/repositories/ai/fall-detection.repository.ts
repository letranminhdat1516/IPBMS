import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FallDetectionRepository {
  constructor(private readonly _prisma: PrismaService) {}

  async getSettings() {
    return this._prisma.system_config.findMany({
      where: { category: 'ai' },
    });
  }

  async findRecentAbnormalEvents(userId: string, since: Date, limit: number) {
    return this._prisma.events.findMany({
      where: {
        user_id: userId,
        event_type: 'abnormal_behavior',
        detected_at: { gte: since },
      },
      select: { detected_at: true, confirm_status: true },
      orderBy: { detected_at: 'desc' },
      take: limit,
    });
  }

  async findUsersWithRecentAbnormalEvents(since: Date) {
    return this._prisma.events.findMany({
      where: {
        event_type: 'abnormal_behavior',
        detected_at: { gte: since },
      },
      distinct: ['user_id'],
      select: { user_id: true },
    });
  }

  async findLatestAbnormalEvent(userId: string) {
    return this._prisma.events.findFirst({
      where: { user_id: userId, event_type: 'abnormal_behavior' },
      orderBy: { detected_at: 'desc' },
      // include a few useful fields so callers can log/inspect the abnormal behavior
      select: {
        event_id: true,
        detected_at: true,
        event_description: true,
        detection_data: true,
        ai_analysis_result: true,
        confidence_score: true,
        context_data: true,
        confirm_status: true,
        status: true,
      },
    });
  }

  async findSupplement(userId: string) {
    return this._prisma.patient_supplements.findFirst({
      where: { customer_id: userId },
      select: { call_confirmed_until: true },
    });
  }

  async findEmergencyContacts(userId: string) {
    return this._prisma.emergency_contacts.findMany({
      where: { user_id: userId, is_deleted: false },
      select: { id: true, name: true, phone: true, alert_level: true },
      orderBy: [{ alert_level: 'asc' }, { created_at: 'asc' }],
    });
  }

  async createAlert(userId: string, eventId: string, message: string) {
    // Alerts were merged into notifications; create a notification record
    return this._prisma.notifications.create({
      data: {
        user_id: userId,
        business_type: 'emergency_alert',
        channel: 'in_app',
        severity: 'high',
        message,
        status: 'pending',
        delivery_data: { event_id: eventId },
      },
      select: { notification_id: true },
    });
  }

  async markEventAsNormal(eventId: string) {
    return this._prisma.events.update({
      where: { event_id: eventId },
      data: { status: 'normal' },
    });
  }
}
