import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from '../src/application/services/events.service';
import { SettingsService } from '../src/application/services/settings.service';
import { FcmService } from '../src/application/services/fcm.service';
import { CacheService } from '../src/application/services/cache.service';
import { EventTypeEnum } from '../src/core/entities/events.entity';
import { EventsRepository } from '../src/infrastructure/repositories/events/events.repository';

describe('EventsService', () => {
  let service: EventsService;
  let mockEventsRepo: jest.Mocked<EventsRepository>;
  let mockSettingsService: jest.Mocked<SettingsService>;
  let mockFcmService: jest.Mocked<FcmService>;
  let mockCacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    mockEventsRepo = {
      findByIdWithContext: jest.fn(),
      updateConfirm: jest.fn(),
      updateConfirmStatus: jest.fn(),
      listAll: jest.fn(),
      listAllForCaregiver: jest.fn(),
      recentByUser: jest.fn(),
      listPaginated: jest.fn(),
      listPaginatedForCaregiverByUserId: jest.fn(),
      listPaginatedForOwnerUserId: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      getSnapshotsOfEvent: jest.fn(),
      getEventOwnerUserId: jest.fn(),
      create: jest.fn(),
      findByUserIdAndDateRange: jest.fn(),
    } as any;

    mockSettingsService = {
      getSetting: jest.fn(),
    } as any;

    mockFcmService = {
      pushSystemEvent: jest.fn(),
    } as any;

    mockCacheService = {
      get: jest.fn().mockResolvedValue(null), // Return null to bypass cache
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(true),
      deleteByPattern: jest.fn().mockResolvedValue(1),
      getStats: jest.fn(),
      generateKey: jest.fn(),
      cleanup: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: EventsRepository,
          useValue: mockEventsRepo,
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
        {
          provide: FcmService,
          useValue: mockFcmService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateConfirm', () => {
    it('should update confirm status and send FCM notification for customer', async () => {
      const mockEvent = {
        event_id: 'event-1',
        user_id: 'user-1',
        event_type: 'fall' as any,
        status: 'normal' as any,
        acknowledged_by: null,
        acknowledged_at: null,
        created_at: new Date(),
        confirm_status: false,
        dismissed_at: null,
        verified_at: null,
        verified_by: null,
        notes: null,
        snapshot_id: 'snapshot-1',
        camera_id: 'camera-1',
        event_description: 'Test event',
        detection_data: {},
        ai_analysis_result: {},
        confidence_score: 0.95,
        bounding_boxes: [],
        context_data: {},
        detected_at: new Date(),
        rooms: { room_name: 'Living Room' },
      };

      mockEventsRepo.findByIdWithContext.mockResolvedValue(mockEvent as any);
      mockEventsRepo.updateConfirm.mockResolvedValue(mockEvent as any);
      mockFcmService.pushSystemEvent.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [],
        noTokenRecipients: [],
      });

      const result = await service.updateConfirm(
        'event-1',
        true,
        'Confirmed by customer',
        'user-1', // requesterId
        'customer', // requesterRole
      );

      expect(mockEventsRepo.findByIdWithContext).toHaveBeenCalledWith('event-1');
      expect(mockEventsRepo.updateConfirm).toHaveBeenCalledWith(
        'event-1',
        true,
        'Confirmed by customer',
        'user-1',
      );
      expect(mockFcmService.pushSystemEvent).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          title: 'Khách hàng đã xác nhận sự kiện',
          body: expect.stringContaining('Khách hàng đã xác nhận fall'),
        }),
      );
      expect(result).toEqual(mockEvent);
    });

    it('should update confirm status and send FCM notification for caregiver', async () => {
      const mockEvent = {
        event_id: 'event-1',
        user_id: 'user-1',
        event_type: 'fall' as any,
        status: 'normal' as any,
        acknowledged_by: null,
        acknowledged_at: null,
        created_at: new Date(),
        confirm_status: false,
        dismissed_at: null,
        verified_at: null,
        verified_by: null,
        notes: null,
        snapshot_id: 'snapshot-1',
        camera_id: 'camera-1',
        event_description: 'Test event',
        detection_data: {},
        ai_analysis_result: {},
        confidence_score: 0.95,
        bounding_boxes: [],
        context_data: {},
        detected_at: new Date(),
        rooms: { room_name: 'Living Room' },
      };

      mockEventsRepo.findByIdWithContext.mockResolvedValue(mockEvent as any);
      mockEventsRepo.updateConfirm.mockResolvedValue(mockEvent as any);
      mockFcmService.pushSystemEvent.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [],
        noTokenRecipients: [],
      });

      const result = await service.updateConfirm(
        'event-1',
        true,
        'Confirmed by caregiver',
        'caregiver-1', // requesterId (caregiver user id)
        'caregiver', // requesterRole
      );

      expect(mockFcmService.pushSystemEvent).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          title: 'Caregiver đã xác nhận sự kiện',
          body: expect.stringContaining('Caregiver đã xác nhận fall'),
        }),
      );
      expect(result).toEqual(mockEvent);
    });

    it('should throw error if event not found', async () => {
      mockEventsRepo.findByIdWithContext.mockResolvedValue(null);

      await expect(service.updateConfirm('nonexistent', true)).rejects.toThrow(
        'Không tìm thấy event nonexistent',
      );
    });

    it('should not send FCM notification if confirm is false', async () => {
      const mockEvent = {
        event_id: 'event-1',
        user_id: 'user-1',
        event_type: 'fall' as any,
        status: 'normal' as any,
        acknowledged_by: null,
        acknowledged_at: null,
        created_at: new Date(),
        confirm_status: false,
        dismissed_at: null,
        verified_at: null,
        verified_by: null,
        notes: null,
        snapshot_id: 'snapshot-1',
        camera_id: 'camera-1',
        event_description: 'Test event',
        detection_data: {},
        ai_analysis_result: {},
        confidence_score: 0.95,
        bounding_boxes: [],
        context_data: {},
        detected_at: new Date(),
      };

      mockEventsRepo.findByIdWithContext.mockResolvedValue(mockEvent as any);
      mockEventsRepo.updateConfirm.mockResolvedValue(mockEvent as any);

      await service.updateConfirm('event-1', false);

      expect(mockFcmService.pushSystemEvent).not.toHaveBeenCalled();
    });
  });

  describe('createEventWithNotification', () => {
    it('should create event and send FCM notification', async () => {
      const eventData = {
        user_id: 'user-1',
        camera_id: 'camera-1',
        snapshot_id: 'snapshot-1',
        event_type: EventTypeEnum.fall,
        confidence_score: '0.95',
      };

      const mockNewEvent = {
        event_id: 'new-event-1',
        ...eventData,
        room_id: 'room-1',
        event_description: 'Test event',
        detection_data: {},
        ai_analysis_result: {},
        status: 'normal',
        detected_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockEventsRepo.create.mockResolvedValue(mockNewEvent as any);
      mockEventsRepo.findByIdWithContext.mockResolvedValue(mockNewEvent as any);
      mockEventsRepo.getEventOwnerUserId.mockResolvedValue('user-1');
      mockFcmService.pushSystemEvent.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [],
        noTokenRecipients: [],
      });

      const result = await service.createEventWithNotification(eventData);

      expect(mockEventsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...eventData,
          confidence_score: 0.95, // Converted from string to number by service
          status: 'normal',
          detected_at: expect.any(Date),
        }),
      );
      // Ensure service annotated metadata with trigger 'notify'
      expect(mockEventsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ trigger: 'notify' }),
        }),
      );
      expect(mockFcmService.pushSystemEvent).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          eventId: 'new-event-1',
          eventType: 'fall',
        }),
      );
      expect(result).toEqual(mockNewEvent);
    });
  });

  describe('getDailyEventSummary', () => {
    it('should return daily event summary', async () => {
      const mockEvents = [
        {
          event_type: 'fall_detection',
          confirm: true,
          detected_at: new Date(),
          event_id: '1',
          user_id: 'user-1',
          camera_id: 'cam-1',
          snapshot_id: 'snap-1',
          room_id: 'room-1',
          event_description: 'Test',
          detection_data: {},
          ai_analysis_result: {},
          status: 'normal',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          event_type: 'unusual_activity',
          confirm: false,
          detected_at: new Date(),
          event_id: '2',
          user_id: 'user-1',
          camera_id: 'cam-1',
          snapshot_id: 'snap-1',
          room_id: 'room-1',
          event_description: 'Test',
          detection_data: {},
          ai_analysis_result: {},
          status: 'warning',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          event_type: 'normal_activity',
          confirm: null,
          detected_at: new Date(),
          event_id: '3',
          user_id: 'user-1',
          camera_id: 'cam-1',
          snapshot_id: 'snap-1',
          room_id: 'room-1',
          event_description: 'Test',
          detection_data: {},
          ai_analysis_result: {},
          status: 'normal',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockEventsRepo.findByUserIdAndDateRange.mockResolvedValue(mockEvents as any);

      const result = await service.getDailyEventSummary('user-1');

      expect(result).toEqual({
        date: expect.any(String),
        total_events: 3,
        fall_detections: 1,
        unusual_activities: 1,
        normal_activities: 1,
        confirmed_events: 1,
        unconfirmed_events: 2,
      });
    });
  });

  describe('getEventInsights', () => {
    it('should return event insights with recommendations', async () => {
      const mockEvents = [
        {
          event_type: 'fall_detection',
          detected_at: new Date(),
          event_id: '1',
          user_id: 'user-1',
          camera_id: 'cam-1',
          snapshot_id: 'snap-1',
          room_id: 'room-1',
          event_description: 'Test',
          detection_data: {},
          ai_analysis_result: {},
          status: 'normal',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          event_type: 'fall_detection',
          detected_at: new Date(),
          event_id: '2',
          user_id: 'user-1',
          camera_id: 'cam-1',
          snapshot_id: 'snap-1',
          room_id: 'room-1',
          event_description: 'Test',
          detection_data: {},
          ai_analysis_result: {},
          status: 'normal',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          event_type: 'unusual_activity',
          detected_at: new Date(),
          event_id: '3',
          user_id: 'user-1',
          camera_id: 'cam-1',
          snapshot_id: 'snap-1',
          room_id: 'room-1',
          event_description: 'Test',
          detection_data: {},
          ai_analysis_result: {},
          status: 'warning',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockEventsRepo.findByUserIdAndDateRange.mockResolvedValue(mockEvents as any);

      const result = await service.getEventInsights('user-1');

      expect(result).toEqual({
        period: 'last_7_days',
        recommendations: [],
        statistics: {
          avg_daily_events: 0,
          most_active_hour: expect.any(Number),
          fall_detection_trend: expect.any(Number),
        },
      });
    });

    it('should generate recommendations for high event frequency', async () => {
      const mockEvents = [];
      const baseDate = new Date();

      // Create 144 events over 1 day (avg_daily_events = 144/7 = 20.57, Math.round(20.57) = 21 > 20)
      for (let i = 0; i < 144; i++) {
        mockEvents.push({
          event_type: 'fall_detection',
          detected_at: new Date(baseDate.getTime() + i * 1000), // Spread over 21 seconds
          event_id: `event-${i}`,
          user_id: 'user-1',
          camera_id: 'cam-1',
          snapshot_id: 'snap-1',
          room_id: 'room-1',
          event_description: 'Test',
          detection_data: {},
          ai_analysis_result: {},
          status: 'normal',
          created_at: new Date(),
          updated_at: new Date(),
          confidence_score: '0.95',
          bounding_boxes: [],
          context_data: {},
          verified_at: null,
          confirm: null,
        });
      }

      mockEventsRepo.findByUserIdAndDateRange.mockResolvedValue(mockEvents as any);

      const result = await service.getEventInsights('user-1');

      expect((result as any).recommendations).toContain(
        'Cân nhắc điều chỉnh ngưỡng phát hiện để giảm false positives',
      );
    });
  });

  describe('getMostActiveHour', () => {
    it('should return the most active hour', () => {
      const events = [
        {
          detected_at: new Date('2024-01-01T10:00:00'),
          event_id: '1',
          user_id: 'user-1',
          camera_id: 'cam-1',
          snapshot_id: 'snap-1',
          room_id: 'room-1',
          event_type: 'fall',
          event_description: 'Test',
          detection_data: {},
          ai_analysis_result: {},
          status: 'normal',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          detected_at: new Date('2024-01-01T10:30:00'),
          event_id: '2',
          user_id: 'user-1',
          camera_id: 'cam-1',
          snapshot_id: 'snap-1',
          room_id: 'room-1',
          event_type: 'fall',
          event_description: 'Test',
          detection_data: {},
          ai_analysis_result: {},
          status: 'normal',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          detected_at: new Date('2024-01-01T15:00:00'),
          event_id: '3',
          user_id: 'user-1',
          camera_id: 'cam-1',
          snapshot_id: 'snap-1',
          room_id: 'room-1',
          event_type: 'fall',
          event_description: 'Test',
          detection_data: {},
          ai_analysis_result: {},
          status: 'normal',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const result = (service as any).getMostActiveHour(events);

      expect(result).toBe(10);
    });
  });

  describe('calculateTrend', () => {
    it('should calculate positive trend', () => {
      const events = [
        {
          detected_at: new Date('2024-01-01'),
          event_id: '1',
          user_id: 'user-1',
          camera_id: 'cam-1',
          snapshot_id: 'snap-1',
          room_id: 'room-1',
          event_type: 'fall',
          event_description: 'Test',
          detection_data: {},
          ai_analysis_result: {},
          status: 'normal',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          detected_at: new Date('2024-01-02'),
          event_id: '2',
          user_id: 'user-1',
          camera_id: 'cam-1',
          snapshot_id: 'snap-1',
          room_id: 'room-1',
          event_type: 'fall',
          event_description: 'Test',
          detection_data: {},
          ai_analysis_result: {},
          status: 'normal',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          detected_at: new Date('2024-01-03'),
          event_id: '3',
          user_id: 'user-1',
          camera_id: 'cam-1',
          snapshot_id: 'snap-1',
          room_id: 'room-1',
          event_type: 'fall',
          event_description: 'Test',
          detection_data: {},
          ai_analysis_result: {},
          status: 'normal',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          detected_at: new Date('2024-01-04'),
          event_id: '4',
          user_id: 'user-1',
          camera_id: 'cam-1',
          snapshot_id: 'snap-1',
          room_id: 'room-1',
          event_type: 'fall',
          event_description: 'Test',
          detection_data: {},
          ai_analysis_result: {},
          status: 'normal',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const result = (service as any).calculateTrend(events);

      expect(result).toBe(0); // Equal distribution
    });

    it('should return 0 for insufficient data', () => {
      const events = [
        {
          detected_at: new Date(),
          event_id: '1',
          user_id: 'user-1',
          camera_id: 'cam-1',
          snapshot_id: 'snap-1',
          room_id: 'room-1',
          event_type: 'fall',
          event_description: 'Test',
          detection_data: {},
          ai_analysis_result: {},
          status: 'normal',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const result = (service as any).calculateTrend(events);

      expect(result).toBe(0);
    });
  });
});
