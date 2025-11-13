import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Notification } from '../../../core/entities/notifications.entity';
import type { PaginateOptions, PaginateResult } from '../../../core/types/paginate.types';
import { NotificationsRepository } from '../../../infrastructure/repositories/notifications/notifications.repository';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly _repo: NotificationsRepository,
    private readonly _emitter: EventEmitter2,
  ) {}

  async findById(notification_id: string): Promise<Notification> {
    const notification = await this._repo.findNotificationById(notification_id);
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  findAll(): Promise<Notification[]> {
    return this._repo.findAllNotifications();
  }

  // Phân trang notifications
  async paginateDynamic(options: PaginateOptions): Promise<PaginateResult<Notification>> {
    const safeOrder = options.order || { sent_at: 'desc' };
    return this._repo.paginateNotificationsDynamic({ ...options, order: safeOrder });
  }

  async create(data: Partial<Notification>): Promise<Notification> {
    const noti = await this._repo.createNotification(data);
    await this._emitter.emitAsync('notification.created', noti);
    return noti;
  }

  async update(notification_id: string, data: Partial<Notification>): Promise<Notification> {
    const updated = await this._repo.updateNotification(notification_id, data);
    if (!updated) throw new NotFoundException('Notification not found');
    return updated;
  }

  async remove(notification_id: string) {
    return this._repo.removeNotification(notification_id);
  }

  async markAsRead(notification_id: string): Promise<Notification> {
    const updated = await this._repo.updateNotification(notification_id, { read_at: new Date() });
    if (!updated) throw new NotFoundException('Notification not found');
    return updated;
  }

  async markBulkAsRead(notificationIds: string[]): Promise<number> {
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) return 0;
    const count = await this._repo.updateNotificationsBulk(notificationIds, {
      read_at: new Date(),
    });
    return count as unknown as number;
  }

  async markAllAsRead(user_id: string): Promise<number> {
    // delegate to repo which will only update unread notifications for the user
    return this._repo.markAllReadForUser(user_id);
  }

  async getNotificationsByIds(ids: string[]): Promise<Notification[]> {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    return this._repo.findNotificationsByIds(ids);
  }

  /**
   * Count unread notifications. If user_id is provided it will be used to filter.
   * We intentionally don't use ParseUUIDPipe here to avoid 400s on query params.
   */
  async countUnread(user_id?: string): Promise<number> {
    // Basic UUID v4 check — tolerate missing or malformatted values by ignoring them
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const uid = user_id && uuidV4Regex.test(user_id) ? user_id : undefined;
    return this._repo.countUnread(uid);
  }
}
