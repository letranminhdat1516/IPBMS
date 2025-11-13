import { Injectable } from '@nestjs/common';
import { BasePrismaRepository } from '../shared/base-prisma.repository';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import type { user_preferences } from '@prisma/client';
import { NotificationLog } from '../../../core/entities/notification-logs.entity';

@Injectable()
export class NotificationLogsRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async findByNotificationId(notificationId: string): Promise<NotificationLog[]> {
    const settings = await this.prisma.user_preferences.findMany({
      where: {
        category: 'notification_logs',
        setting_key: notificationId, // Using setting_key to store notification_id
      },
    });
    return settings.map((setting) => this.settingToNotificationLog(setting));
  }

  async findAll(): Promise<NotificationLog[]> {
    const settings = await this.prisma.user_preferences.findMany({
      where: {
        category: 'notification_logs',
      },
    });
    return settings.map((setting) => this.settingToNotificationLog(setting));
  }

  async create(data: Partial<NotificationLog>): Promise<NotificationLog> {
    const setting = await this.prisma.user_preferences.create({
      data: {
        user_id: data.recipient_id || 'system',
        category: 'notification_logs',
        setting_key: data.notification_id!,
        setting_value: JSON.stringify(data),
      },
    });
    return this.settingToNotificationLog(setting);
  }

  async update(id: string, data: Partial<NotificationLog>): Promise<NotificationLog | null> {
    try {
      const setting = await this.prisma.user_preferences.update({
        where: { id },
        data: {
          setting_value: JSON.stringify(data),
        },
      });
      return this.settingToNotificationLog(setting);
    } catch {
      return null;
    }
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    try {
      await this.prisma.user_preferences.delete({
        where: { id },
      });
      return { deleted: true };
    } catch {
      return { deleted: false };
    }
  }

  private settingToNotificationLog(setting: user_preferences): NotificationLog {
    const data = JSON.parse(setting.setting_value);
    return {
      id: setting.id,
      notification_id: setting.setting_key,
      recipient_id: setting.user_id,
      channel: data.channel,
      status: data.status,
      error_message: data.error_message,
      metadata: data.metadata,
      provider_message_id: data.provider_message_id,
      sent_at: data.sent_at,
      delivered_at: data.delivered_at,
      created_at: data.created_at || new Date(),
      notification: undefined as any, // Not available in user_preferences approach
    };
  }
}
