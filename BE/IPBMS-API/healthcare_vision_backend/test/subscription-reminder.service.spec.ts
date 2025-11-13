import { SubscriptionReminderService } from '@/application/services';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from '../src/application/services/alerts.service';
import { MailService } from '../src/application/services/mail.service';
import { NotificationsService } from '../src/application/services/notifications.service';
import { SystemConfigService } from '../src/application/services/system/system-config.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { SubscriptionEventRepository } from '../src/infrastructure/repositories/payments/subscription-event.repository';

describe('SubscriptionReminderService', () => {
  let service: SubscriptionReminderService;
  let alertsService: AlertsService;
  let notificationsService: NotificationsService;
  let mailService: MailService;
  let systemSettingsService: SystemConfigService;
  let prismaService: PrismaService;

  const mockAlertsService = {
    create: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  const mockMailService = {
    sendSubscriptionExpiryNotice: jest.fn(),
  };

  const mockSystemSettingsService = {
    getJson: jest.fn(),
    getBoolean: jest.fn(),
  };

  const mockPrismaService = {
    subscriptions: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    emailTemplate: {
      findFirst: jest.fn(),
    },
  };

  const mockConfigService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionReminderService,
        {
          provide: AlertsService,
          useValue: mockAlertsService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
        {
          provide: SystemConfigService,
          useValue: mockSystemSettingsService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          // SubscriptionReminderService depends on SubscriptionEventRepository in constructor
          provide: SubscriptionEventRepository,
          useValue: {
            createIfNotExists: jest.fn(),
            createIfNotExistsByEventData: jest.fn().mockResolvedValue({ created_at: new Date() }),
            createIfNotExistsByEventDataInTransaction: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionReminderService>(SubscriptionReminderService);
    alertsService = module.get<AlertsService>(AlertsService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
    mailService = module.get<MailService>(MailService);
    systemSettingsService = module.get<SystemConfigService>(SystemConfigService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleReminders', () => {
    it('should create alerts and notifications before sending emails for expiring subscriptions', async () => {
      const mockSubscriptions = [
        {
          subscription_id: 'sub-1',
          user_id: 'user-1',
          plan_code: 'premium',
          current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          users: {
            user_id: 'user-1',
            email: 'user1@example.com',
            full_name: 'John Doe',
            is_active: true,
          },
          plans: {
            name: 'Premium Plan',
            code: 'premium',
          },
        },
        {
          subscription_id: 'sub-2',
          user_id: 'user-2',
          plan_code: 'basic',
          current_period_end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          users: {
            user_id: 'user-2',
            email: 'user2@example.com',
            full_name: 'Jane Smith',
            is_active: true,
          },
          plans: {
            name: 'Basic Plan',
            code: 'basic',
          },
        },
      ];

      const mockUsers = [
        {
          user_id: 'user-1',
          email: 'user1@example.com',
          first_name: 'John',
          last_name: 'Doe',
        },
        {
          user_id: 'user-2',
          email: 'user2@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
        },
      ];

      const mockTemplate = {
        template_id: 'template-1',
        type: 'subscription_expiry_reminder',
        subject: 'Subscription Expiring Soon',
        html_content: '<p>Your subscription is expiring soon.</p>',
      };

      mockSystemSettingsService.getJson.mockResolvedValue([7, 3, 1]);
      mockSystemSettingsService.getBoolean.mockResolvedValue(false);
      mockPrismaService.subscriptions.findMany.mockResolvedValue(mockSubscriptions);
      // Alerts service returns notification_id which is used when creating notifications
      mockAlertsService.create
        .mockResolvedValueOnce({ notification_id: 'notif-alert-1', alert_id: 'alert-1' })
        .mockResolvedValueOnce({ notification_id: 'notif-alert-2', alert_id: 'alert-2' });
      mockNotificationsService.create.mockResolvedValue({ notification_id: 'notif-1' });
      mockMailService.sendSubscriptionExpiryNotice.mockResolvedValue({ success: true });

      await service.handleReminders();

      expect(mockPrismaService.subscriptions.findMany).toHaveBeenCalled();

      // Verify alerts are created for each subscription
      expect(mockAlertsService.create).toHaveBeenCalledTimes(2);
      expect(mockAlertsService.create).toHaveBeenNthCalledWith(1, {
        event_id: 'sub-1',
        user_id: 'user-1',
        alert_type: 'info', // Using 'info' temporarily until enum is updated
        severity: 'medium',
        alert_message: 'Subscription Premium Plan expires in 7 days',
        alert_data: {
          subscription_id: 'sub-1',
          plan_name: 'Premium Plan',
          plan_code: 'premium',
          expiry_date: mockSubscriptions[0].current_period_end,
          days_left: 7,
        },
        status: 'active',
      });
      expect(mockAlertsService.create).toHaveBeenNthCalledWith(2, {
        event_id: 'sub-2',
        user_id: 'user-2',
        alert_type: 'info',
        severity: 'medium',
        alert_message: 'Subscription Basic Plan expires in 3 days',
        alert_data: {
          subscription_id: 'sub-2',
          plan_name: 'Basic Plan',
          plan_code: 'basic',
          expiry_date: mockSubscriptions[1].current_period_end,
          days_left: 3,
        },
        status: 'active',
      });

      // Verify notifications are created for each subscription
      expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
      // Service forwards alert.notification_id as notification_id when creating notifications
      expect(mockNotificationsService.create).toHaveBeenNthCalledWith(1, {
        notification_id: 'notif-alert-1',
        user_id: 'user-1',
        business_type: 'system_update',
        notification_type: 'email',
        message: 'Subscription Premium Plan expires in 7 days',
        delivery_data: {
          email_template: 'subscription_expiry',
          subscription_id: 'sub-1',
          days_left: 7,
        },
      });
      expect(mockNotificationsService.create).toHaveBeenNthCalledWith(2, {
        notification_id: 'notif-alert-2',
        user_id: 'user-2',
        business_type: 'system_update',
        notification_type: 'email',
        message: 'Subscription Basic Plan expires in 3 days',
        delivery_data: {
          email_template: 'subscription_expiry',
          subscription_id: 'sub-2',
          days_left: 3,
        },
      });

      // Verify emails are still sent
      expect(mockMailService.sendSubscriptionExpiryNotice).toHaveBeenCalledTimes(2);
    });

    it('should handle empty expiring subscriptions list', async () => {
      mockSystemSettingsService.getJson.mockResolvedValue([7, 3, 1]);
      mockSystemSettingsService.getBoolean.mockResolvedValue(false);
      mockPrismaService.subscriptions.findMany.mockResolvedValue([]);

      await service.handleReminders();

      expect(mockPrismaService.subscriptions.findMany).toHaveBeenCalled();
      expect(mockAlertsService.create).not.toHaveBeenCalled();
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
      expect(mockMailService.sendSubscriptionExpiryNotice).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockSubscriptions = [
        {
          subscription_id: 'sub-1',
          user_id: 'user-1',
          plan_code: 'premium',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ];

      mockSystemSettingsService.getJson.mockResolvedValue([7, 3, 1]);
      mockSystemSettingsService.getBoolean.mockResolvedValue(false);
      mockPrismaService.subscriptions.findMany.mockResolvedValue(mockSubscriptions);
      mockPrismaService.user.findUnique.mockRejectedValue(new Error('User not found'));
      mockPrismaService.emailTemplate.findFirst.mockResolvedValue({
        template_id: 'template-1',
        type: 'subscription_expiry_reminder',
        subject: 'Subscription Expiring Soon',
        html_content: '<p>Your subscription is expiring soon.</p>',
      });

      // Should not throw error, just log it
      await expect(service.handleReminders()).resolves.not.toThrow();

      expect(mockPrismaService.subscriptions.findMany).toHaveBeenCalled();
      // Alert and notification creation should not be called due to user lookup failure
      expect(mockAlertsService.create).not.toHaveBeenCalled();
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
      expect(mockMailService.sendSubscriptionExpiryNotice).not.toHaveBeenCalled();
    });
  });
});
