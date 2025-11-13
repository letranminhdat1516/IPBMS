import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionRepository } from '../../../infrastructure/repositories/payments/subscription.repository';
import { NotificationService } from '../../../shared/services/notification.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class SubscriptionAlertsService {
  private readonly logger = new Logger(SubscriptionAlertsService.name);

  constructor(
    private readonly _subscriptionRepo: SubscriptionRepository,
    private readonly _notificationService: NotificationService,
    private readonly _usersService: UsersService,
  ) {}

  async getExpiringSoon(daysAhead = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const currentDate = new Date();

    return this._subscriptionRepo.findAll({
      where: {
        current_period_end: {
          gt: currentDate,
          lt: futureDate,
        },
        status: 'active',
      },
      include: {
        users: true,
      },
    });
  }

  async getExpired() {
    const currentDate = new Date();

    return this._subscriptionRepo.findAll({
      where: {
        current_period_end: {
          lt: currentDate,
        },
        status: 'active',
      },
      include: {
        users: true,
      },
    });
  }

  async sendRenewalReminders() {
    const expiringSubscriptions = await this.getExpiringSoon(7); // Within 7 days

    let remindersSent = 0;
    const failedReminders = [];

    for (const subscription of expiringSubscriptions) {
      try {
        // Fetch user details using user_id from subscription
        const user = await this._usersService.findById(subscription.user_id);

        if (user?.email) {
          const planName = subscription.plan_code || 'Current Plan';
          const expiryDate =
            subscription.current_period_end?.toLocaleDateString('vi-VN') || 'Unknown';

          const sent = await this._notificationService.sendSubscriptionExpiryReminder(
            user.email,
            planName,
            expiryDate,
          );

          if (sent) {
            remindersSent++;
            this.logger.log(`Sent renewal reminder to ${user.email} for plan ${planName}`);
          } else {
            failedReminders.push(user.email);
            this.logger.warn(`Failed to send renewal reminder to ${user.email}`);
          }
        }
      } catch (error) {
        this.logger.error(
          `Error sending renewal reminder for subscription ${subscription.subscription_id}:`,
          error,
        );
        failedReminders.push('unknown');
      }
    }

    return {
      remindersSent,
      failedCount: failedReminders.length,
      totalSubscriptions: expiringSubscriptions.length,
      failedEmails: failedReminders,
    };
  }

  async getStatistics() {
    const expiringSoon = await this.getExpiringSoon();
    const expired = await this.getExpired();

    return {
      expiringSoonCount: expiringSoon.length,
      expiredCount: expired.length,
      totalAlerts: expiringSoon.length + expired.length,
    };
  }
}
