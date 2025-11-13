import { Injectable } from '@nestjs/common';
import { Notification } from '../../../core/entities/notifications.entity';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

@Injectable()
export class NotificationsRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async findNotificationById(notification_id: string): Promise<Notification | null> {
    return super.findById<Notification>('notifications', notification_id);
  }

  async findAllNotifications(): Promise<Notification[]> {
    const result = await super.paginate<Notification>('notifications', { take: 1000 });
    return result.data as Notification[];
  }

  async paginateNotificationsDynamic(options: {
    where?: any;
    page?: number;
    limit?: number;
    order?: any;
  }) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? Number(options.limit) : 20;

    return super.paginate<Notification>('notifications', {
      where: options.where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: options.order,
    });
  }

  async createNotification(data: Partial<Notification>): Promise<Notification> {
    return super.createRecord<Notification>('notifications', data);
  }

  async updateNotification(
    notification_id: string,
    data: Partial<Notification>,
  ): Promise<Notification | null> {
    return super.updateRecord<Notification>('notifications', notification_id, data);
  }

  async removeNotification(notification_id: string): Promise<{ deleted: boolean }> {
    try {
      await super.hardDelete<Notification>('notifications', notification_id);
      return { deleted: true };
    } catch {
      return { deleted: false };
    }
  }

  async updateNotificationsBulk(notificationIds: string[], data: any): Promise<number> {
    const result = await this.prismaService.notifications.updateMany({
      where: {
        notification_id: {
          in: notificationIds,
        },
      },
      data,
    });

    return result.count;
  }

  async findNotificationsByIds(ids: string[]): Promise<Notification[]> {
    return super.findManyByIds<Notification>('notifications', ids);
  }

  async countUnread(user_id?: string): Promise<number> {
    const where: any = { read_at: null };
    if (user_id) where.user_id = user_id;
    const count = await this.prismaService.notifications.count({ where });
    return count;
  }

  async markAllReadForUser(user_id: string): Promise<number> {
    const result = await this.prismaService.notifications.updateMany({
      where: {
        user_id,
        read_at: null,
      },
      data: {
        read_at: new Date(),
      },
    });

    return result.count;
  }
}
