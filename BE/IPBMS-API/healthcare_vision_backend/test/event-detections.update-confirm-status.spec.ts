import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventDetectionsService } from '../src/application/services/event-detections.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { EventDetectionsRepository } from '../src/infrastructure/repositories/events/event-detections.repository';

describe('EventDetectionsService - updateConfirmStatus', () => {
  let service: EventDetectionsService;
  let repository: EventDetectionsRepository;
  let prisma: PrismaService;

  const mockEventId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockCameraId = '880h1733-h51e-73g7-d049-779988773333';

  const mockEvent = {
    event_id: mockEventId,
    snapshot_id: '660f9511-f39c-51e5-b827-557766551111',
    user_id: '770g0622-g40d-62f6-c938-668877662222',
    camera_id: mockCameraId,
    event_type: 'fall',
    event_description: 'Phát hiện ngã',
    confidence_score: 0.95,
    confirm_status: null,
    detected_at: new Date('2025-10-10T10:25:00.000Z'),
    status: 'normal',
    created_at: new Date('2025-10-10T10:25:05.000Z'),
    updated_at: new Date('2025-10-10T10:25:05.000Z'),
  };

  const mockCamera = {
    camera_id: mockCameraId,
    user_id: mockUserId,
    name: 'Living Room Camera',
    status: 'active',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventDetectionsService,
        {
          provide: EventDetectionsRepository,
          useValue: {
            findEventById: jest.fn(),
            updateConfirmStatus: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            cameras: {
              findUnique: jest.fn(),
            },
            caregiver_invitations: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<EventDetectionsService>(EventDetectionsService);
    repository = module.get<EventDetectionsRepository>(EventDetectionsRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('updateConfirmStatus - Authorization', () => {
    it('should allow owner to update confirm_status', async () => {
      // Arrange
      jest.spyOn(repository, 'findEventById').mockResolvedValue(mockEvent as any);
      jest.spyOn(prisma.cameras, 'findUnique').mockResolvedValue(mockCamera as any);
      jest.spyOn(prisma.caregiver_invitations, 'findMany').mockResolvedValue([]);

      const updatedEvent = {
        ...mockEvent,
        confirm_status: true,
        acknowledged_at: new Date('2025-10-10T10:30:00.000Z'),
        acknowledged_by: mockUserId,
        notes: 'Confirmed by owner',
        updated_at: new Date('2025-10-10T10:30:00.000Z'),
      };
      jest.spyOn(repository, 'updateConfirmStatus').mockResolvedValue(updatedEvent as any);

      // Act
      const result = await service.updateConfirmStatus(
        mockEventId,
        true,
        'Confirmed by owner',
        mockUserId,
      );

      // Assert
      expect(result.confirm_status).toBe(true);
      expect(result.acknowledged_at).toBeDefined();
      expect(result.acknowledged_by).toBe(mockUserId);
      expect(repository.updateConfirmStatus).toHaveBeenCalledWith(
        mockEventId,
        true,
        'Confirmed by owner',
        mockUserId,
      );
    });

    it('should allow caregiver to update confirm_status', async () => {
      // Arrange
      const caregiverId = 'caregiver-123';
      const customerId = mockEvent.user_id;

      jest.spyOn(repository, 'findEventById').mockResolvedValue(mockEvent as any);
      jest.spyOn(prisma.cameras, 'findUnique').mockResolvedValue({
        ...mockCamera,
        user_id: customerId,
      } as any);
      jest.spyOn(prisma.caregiver_invitations, 'findMany').mockResolvedValue([
        {
          caregiver_id: caregiverId,
          customer_id: customerId,
          is_active: true,
        },
      ] as any);

      const updatedEvent = {
        ...mockEvent,
        confirm_status: true,
        acknowledged_at: new Date('2025-10-10T10:30:00.000Z'),
        acknowledged_by: caregiverId,
        notes: 'Confirmed by caregiver',
        updated_at: new Date('2025-10-10T10:30:00.000Z'),
      };
      jest.spyOn(repository, 'updateConfirmStatus').mockResolvedValue(updatedEvent as any);

      // Act
      const result = await service.updateConfirmStatus(
        mockEventId,
        true,
        'Confirmed by caregiver',
        caregiverId,
      );

      // Assert
      expect(result.confirm_status).toBe(true);
      expect(result.acknowledged_by).toBe(caregiverId);
    });

    it('should throw ForbiddenException if user is not owner or caregiver', async () => {
      // Arrange
      const unauthorizedUserId = 'unauthorized-user';

      jest.spyOn(repository, 'findEventById').mockResolvedValue(mockEvent as any);
      jest.spyOn(prisma.cameras, 'findUnique').mockResolvedValue(mockCamera as any);
      jest.spyOn(prisma.caregiver_invitations, 'findMany').mockResolvedValue([]);

      // Act & Assert
      await expect(
        service.updateConfirmStatus(mockEventId, true, 'Unauthorized', unauthorizedUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if event not found', async () => {
      // Arrange
      jest.spyOn(repository, 'findEventById').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateConfirmStatus(mockEventId, true, 'Not found', mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateConfirmStatus - Confirm (true)', () => {
    beforeEach(() => {
      jest.spyOn(repository, 'findEventById').mockResolvedValue(mockEvent as any);
      jest.spyOn(prisma.cameras, 'findUnique').mockResolvedValue(mockCamera as any);
      jest.spyOn(prisma.caregiver_invitations, 'findMany').mockResolvedValue([]);
    });

    it('should set confirm_status to true and update acknowledged fields', async () => {
      // Arrange
      const updatedEvent = {
        ...mockEvent,
        confirm_status: true,
        acknowledged_at: new Date('2025-10-10T10:30:00.000Z'),
        acknowledged_by: mockUserId,
        notes: 'Event confirmed',
        updated_at: new Date('2025-10-10T10:30:00.000Z'),
      };
      jest.spyOn(repository, 'updateConfirmStatus').mockResolvedValue(updatedEvent as any);

      // Act
      const result = await service.updateConfirmStatus(
        mockEventId,
        true,
        'Event confirmed',
        mockUserId,
      );

      // Assert
      expect(result.confirm_status).toBe(true);
      expect(result.acknowledged_at).toBeDefined();
      expect(result.acknowledged_by).toBe(mockUserId);
      expect(result.notes).toBe('Event confirmed');
    });

    it('should update confirm_status to true without notes', async () => {
      // Arrange
      const updatedEvent = {
        ...mockEvent,
        confirm_status: true,
        acknowledged_at: new Date('2025-10-10T10:30:00.000Z'),
        acknowledged_by: mockUserId,
        updated_at: new Date('2025-10-10T10:30:00.000Z'),
      };
      jest.spyOn(repository, 'updateConfirmStatus').mockResolvedValue(updatedEvent as any);

      // Act
      const result = await service.updateConfirmStatus(mockEventId, true, undefined, mockUserId);

      // Assert
      expect(result.confirm_status).toBe(true);
      expect(result.acknowledged_at).toBeDefined();
      expect(result.acknowledged_by).toBe(mockUserId);
      expect(repository.updateConfirmStatus).toHaveBeenCalledWith(
        mockEventId,
        true,
        undefined,
        mockUserId,
      );
    });
  });

  describe('updateConfirmStatus - Reject (false)', () => {
    beforeEach(() => {
      jest.spyOn(repository, 'findEventById').mockResolvedValue(mockEvent as any);
      jest.spyOn(prisma.cameras, 'findUnique').mockResolvedValue(mockCamera as any);
      jest.spyOn(prisma.caregiver_invitations, 'findMany').mockResolvedValue([]);
    });

    it('should set confirm_status to false without updating acknowledged fields', async () => {
      // Arrange
      const updatedEvent = {
        ...mockEvent,
        confirm_status: false,
        notes: 'Not a fall event',
        updated_at: new Date('2025-10-10T10:30:00.000Z'),
        // acknowledged_at and acknowledged_by should NOT be set
      };
      jest.spyOn(repository, 'updateConfirmStatus').mockResolvedValue(updatedEvent as any);

      // Act
      const result = await service.updateConfirmStatus(
        mockEventId,
        false,
        'Not a fall event',
        mockUserId,
      );

      // Assert
      expect(result.confirm_status).toBe(false);
      expect(result.notes).toBe('Not a fall event');
      expect(result.acknowledged_at).toBeUndefined();
      expect(result.acknowledged_by).toBeUndefined();
    });

    it('should set confirm_status to false with empty notes', async () => {
      // Arrange
      const updatedEvent = {
        ...mockEvent,
        confirm_status: false,
        updated_at: new Date('2025-10-10T10:30:00.000Z'),
      };
      jest.spyOn(repository, 'updateConfirmStatus').mockResolvedValue(updatedEvent as any);

      // Act
      const result = await service.updateConfirmStatus(mockEventId, false, undefined, mockUserId);

      // Assert
      expect(result.confirm_status).toBe(false);
      expect(repository.updateConfirmStatus).toHaveBeenCalledWith(
        mockEventId,
        false,
        undefined,
        mockUserId,
      );
    });
  });

  describe('updateConfirmStatus - Edge Cases', () => {
    beforeEach(() => {
      jest.spyOn(repository, 'findEventById').mockResolvedValue(mockEvent as any);
      jest.spyOn(prisma.cameras, 'findUnique').mockResolvedValue(mockCamera as any);
      jest.spyOn(prisma.caregiver_invitations, 'findMany').mockResolvedValue([]);
    });

    it('should handle very long notes', async () => {
      // Arrange
      const longNotes = 'A'.repeat(1000);
      const updatedEvent = {
        ...mockEvent,
        confirm_status: true,
        acknowledged_at: new Date('2025-10-10T10:30:00.000Z'),
        acknowledged_by: mockUserId,
        notes: longNotes,
        updated_at: new Date('2025-10-10T10:30:00.000Z'),
      };
      jest.spyOn(repository, 'updateConfirmStatus').mockResolvedValue(updatedEvent as any);

      // Act
      const result = await service.updateConfirmStatus(mockEventId, true, longNotes, mockUserId);

      // Assert
      expect(result.notes).toBe(longNotes);
    });

    it('should handle special characters in notes', async () => {
      // Arrange
      const specialNotes = 'Confirmed with ñ, ü, é, 中文, 日本語, emoji 😊';
      const updatedEvent = {
        ...mockEvent,
        confirm_status: true,
        acknowledged_at: new Date('2025-10-10T10:30:00.000Z'),
        acknowledged_by: mockUserId,
        notes: specialNotes,
        updated_at: new Date('2025-10-10T10:30:00.000Z'),
      };
      jest.spyOn(repository, 'updateConfirmStatus').mockResolvedValue(updatedEvent as any);

      // Act
      const result = await service.updateConfirmStatus(mockEventId, true, specialNotes, mockUserId);

      // Assert
      expect(result.notes).toBe(specialNotes);
    });

    it('should throw BadRequestException if camera not found', async () => {
      // Arrange
      jest.spyOn(repository, 'findEventById').mockResolvedValue(mockEvent as any);
      jest.spyOn(prisma.cameras, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateConfirmStatus(mockEventId, true, 'Test', mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
