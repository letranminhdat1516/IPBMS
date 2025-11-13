import { Test, TestingModule } from '@nestjs/testing';
import { EventNotificationScheduler } from '../src/application/services/event-notification.scheduler';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { FcmService } from '../src/application/services/fcm.service';

describe('EventNotificationScheduler (with Nest TestingModule)', () => {
  let moduleRef: TestingModule;
  let prismaMock: any;
  let fcmMock: any;
  let scheduler: EventNotificationScheduler;

  beforeEach(async () => {
    prismaMock = {
      events: { findMany: jest.fn() },
      notifications: { create: jest.fn() },
    };

    fcmMock = {
      pushSystemEvent: jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0 }),
      sendNotificationToUser: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        EventNotificationScheduler,
        { provide: PrismaService, useValue: prismaMock },
        { provide: FcmService, useValue: fcmMock },
        // EventConfirmationService is required by the scheduler constructor
        {
          provide: 'EventConfirmationService',
          useValue: {
            autoApprovePending: jest.fn().mockResolvedValue({
              success: true,
              count: 0,
              events: [],
            }),
          },
        },
        {
          provide: (require('../src/application/services/event-confirmation.service') as any)
            .EventConfirmationService,
          useExisting: 'EventConfirmationService',
        },
      ],
    }).compile();

    scheduler = moduleRef.get(EventNotificationScheduler);
  });

  afterEach(async () => {
    await moduleRef.close();
    jest.resetAllMocks();
    // ensure environment doesn't leak between tests
    delete process.env.FCM_ENABLED;
  });

  it('should create alert/notification and call injected FcmService.pushSystemEvent when enabled', async () => {
    process.env.FCM_ENABLED = 'true';

    const fakeEvent = {
      event_id: 'evt-1',
      event_type: 'fall',
      detected_at: new Date().toISOString(),
      camera_id: 'cam-1',
      confidence_score: 0.98,
      cameras: { users: { user_id: 'user-1' } },
    } as any;

    prismaMock.events.findMany.mockResolvedValue([fakeEvent]);
    prismaMock.notifications.create.mockResolvedValue({
      notification_id: 'noti-1',
      delivery_data: {},
    });

    await scheduler.checkPendingEventNotifications();

    expect(prismaMock.notifications.create).toHaveBeenCalled();
    expect(fcmMock.pushSystemEvent).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ eventId: 'evt-1' }),
    );
  });

  it('sends expected title and body to pushSystemEvent when enabled', async () => {
    process.env.FCM_ENABLED = 'true';

    const detectedAt = new Date().toISOString();
    const fakeEvent = {
      event_id: 'evt-3',
      event_type: 'medication_reminder',
      detected_at: detectedAt,
      camera_id: 'cam-3',
      confidence_score: 0.1,
      cameras: { users: { user_id: 'user-3' } },
    } as any;

    prismaMock.events.findMany.mockResolvedValue([fakeEvent]);
    prismaMock.notifications.create.mockResolvedValue({
      notification_id: 'noti-3',
      delivery_data: {},
    });

    await scheduler.checkPendingEventNotifications();

    expect(fcmMock.pushSystemEvent).toHaveBeenCalledTimes(1);
    const [toUser, payload] = (fcmMock.pushSystemEvent as jest.Mock).mock.calls[0];
    expect(toUser).toBe('user-3');
    expect(payload).toHaveProperty('title');
    expect(payload).toHaveProperty('body');
    // title/body should include a localized timestamp string
    expect(typeof payload.title).toBe('string');
    expect(payload.title.length).toBeGreaterThan(0);
    expect(payload.body).toEqual(payload.title);
  });

  it('processes multiple pending events and calls pushSystemEvent for each when enabled', async () => {
    process.env.FCM_ENABLED = 'true';

    const now = new Date().toISOString();
    const events = [
      {
        event_id: 'multi-1',
        event_type: 'fall',
        detected_at: now,
        camera_id: 'c1',
        confidence_score: 0.9,
        cameras: { users: { user_id: 'u1' } },
      },
      {
        event_id: 'multi-2',
        event_type: 'abnormal_behavior',
        detected_at: now,
        camera_id: 'c2',
        confidence_score: 0.5,
        cameras: { users: { user_id: 'u2' } },
      },
    ] as any;

    prismaMock.events.findMany.mockResolvedValue(events);
    prismaMock.notifications.create.mockResolvedValue({ notification_id: 'n', delivery_data: {} });

    await scheduler.checkPendingEventNotifications();

    expect(prismaMock.notifications.create).toHaveBeenCalledTimes(events.length);
    expect(fcmMock.pushSystemEvent).toHaveBeenCalledTimes(events.length);
  });

  it('should NOT call FcmService.pushSystemEvent when FCM is disabled', async () => {
    process.env.FCM_ENABLED = 'false';

    const fakeEvent = {
      event_id: 'evt-2',
      event_type: 'abnormal_behavior',
      detected_at: new Date().toISOString(),
      camera_id: 'cam-2',
      confidence_score: 0.45,
      cameras: { users: { user_id: 'user-2' } },
    } as any;

    prismaMock.events.findMany.mockResolvedValue([fakeEvent]);
    prismaMock.notifications.create.mockResolvedValue({
      notification_id: 'noti-2',
      delivery_data: {},
    });

    await scheduler.checkPendingEventNotifications();

    expect(prismaMock.notifications.create).toHaveBeenCalled();
    expect(fcmMock.pushSystemEvent).not.toHaveBeenCalled();
  });
});
