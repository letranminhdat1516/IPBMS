import { Injectable } from '@nestjs/common';
import { NotificationLog } from '../../../core/entities/notification-logs.entity';
import { NotificationLogsRepository } from '../../../infrastructure/repositories/notifications/notification-logs.repository';

@Injectable()
export class NotificationLogsService {
  constructor(private readonly notificationLogsRepository: NotificationLogsRepository) {}

  async getNotificationLogs(notificationId: string): Promise<NotificationLog[]> {
    return this.notificationLogsRepository.findByNotificationId(notificationId);
  }

  async getAllNotificationLogs(): Promise<NotificationLog[]> {
    return this.notificationLogsRepository.findAll();
  }

  async createNotificationLog(data: Partial<NotificationLog>): Promise<NotificationLog> {
    return this.notificationLogsRepository.create(data);
  }

  async updateNotificationLog(
    id: string,
    data: Partial<NotificationLog>,
  ): Promise<NotificationLog | null> {
    return this.notificationLogsRepository.update(id, data);
  }

  async deleteNotificationLog(id: string): Promise<{ deleted: boolean }> {
    return this.notificationLogsRepository.remove(id);
  }
}
