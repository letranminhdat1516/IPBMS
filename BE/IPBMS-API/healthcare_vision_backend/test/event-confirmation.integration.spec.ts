import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventConfirmationService } from '../src/application/services/event-confirmation.service';

describe('EventConfirmationService - Integration Tests', () => {
  let service: EventConfirmationService;
  let prismaMock: any;
  let fcmMock: any;
  let repositoryMock: any;

  beforeEach(() => {
    fcmMock = {
      sendNotificationToUser: jest.fn().mockResolvedValue(undefined),
    };

    repositoryMock = {
      getEventWithContext: jest.fn(),
      confirmChange: jest.fn(),
      rejectChange: jest.fn(),
      proposeChange: jest.fn(),
      getUserFullName: jest.fn().mockResolvedValue('Test User'),
    };

    prismaMock = {
      $transaction: jest.fn(async (callback) => {
        const tx = {
          event_detections: {
            findUnique: jest.fn(),
            update: jest.fn(),
          },
          users: {
            findUnique: jest.fn(),
          },
        };
        return callback(tx);
      }),
    };

    service = new EventConfirmationService(prismaMock, repositoryMock, undefined, fcmMock);
  });

  describe('Proposal state validation', () => {
    it('should throw ConflictException when trying to confirm already confirmed proposal', async () => {
      repositoryMock.getEventWithContext.mockResolvedValue({
        event_id: 'evt-1',
        confirmation_state: 'CONFIRMED_BY_CUSTOMER', // Already confirmed
        proposed_status: 'resolved',
        previous_status: 'detected',
        cameras: { camera_name: 'Camera 1' },
      });

      await expect(service.confirmChange('evt-1', 'cust-1')).rejects.toThrow(ConflictException);
      await expect(service.confirmChange('evt-1', 'cust-1')).rejects.toThrow(
        'Không có đề xuất nào đang chờ xác nhận',
      );
    });

    it('should throw ConflictException when trying to reject already rejected proposal', async () => {
      repositoryMock.getEventWithContext.mockResolvedValue({
        event_id: 'evt-1',
        confirmation_state: 'REJECTED_BY_CUSTOMER', // Already rejected
        proposed_status: 'resolved',
        previous_status: 'detected',
        cameras: { camera_name: 'Camera 1' },
      });

      await expect(service.rejectChange('evt-1', 'cust-1', 'not valid')).rejects.toThrow(
        ConflictException,
      );
      await expect(service.rejectChange('evt-1', 'cust-1', 'not valid')).rejects.toThrow(
        'Không có đề xuất nào đang chờ từ chối',
      );
    });

    it('should throw ConflictException when trying to confirm already rejected proposal', async () => {
      repositoryMock.getEventWithContext.mockResolvedValue({
        event_id: 'evt-1',
        confirmation_state: 'REJECTED_BY_CUSTOMER', // Was rejected
        proposed_status: 'resolved',
        previous_status: 'detected',
        cameras: { camera_name: 'Camera 1' },
      });

      await expect(service.confirmChange('evt-1', 'cust-1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when trying to reject already confirmed proposal', async () => {
      repositoryMock.getEventWithContext.mockResolvedValue({
        event_id: 'evt-1',
        confirmation_state: 'CONFIRMED_BY_CUSTOMER', // Was confirmed
        proposed_status: 'resolved',
        previous_status: 'detected',
        cameras: { camera_name: 'Camera 1' },
      });

      await expect(service.rejectChange('evt-1', 'cust-1', 'changed mind')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should successfully confirm when state is CAREGIVER_UPDATED', async () => {
      repositoryMock.getEventWithContext.mockResolvedValue({
        event_id: 'evt-1',
        confirmation_state: 'CAREGIVER_UPDATED', // Valid state
        proposed_status: 'resolved',
        proposed_event_type: 'fall',
        previous_status: 'detected',
        proposed_by: 'caregiver-1',
        cameras: { camera_name: 'Camera 1', location_in_room: 'Living Room' },
      });

      repositoryMock.confirmChange.mockResolvedValue({
        event_id: 'evt-1',
        status: 'resolved',
        event_type: 'fall',
        confirmation_state: 'CONFIRMED_BY_CUSTOMER',
      });

      const result = await service.confirmChange('evt-1', 'cust-1');

      expect(result).toBeDefined();
      expect(result.confirmation_state).toBe('CONFIRMED_BY_CUSTOMER');
      expect(repositoryMock.confirmChange).toHaveBeenCalled();
    });

    it('should successfully reject when state is CAREGIVER_UPDATED', async () => {
      repositoryMock.getEventWithContext.mockResolvedValue({
        event_id: 'evt-1',
        confirmation_state: 'CAREGIVER_UPDATED', // Valid state
        proposed_status: 'resolved',
        previous_status: 'detected',
        proposed_by: 'caregiver-1',
        cameras: { camera_name: 'Camera 1', location_in_room: 'Living Room' },
      });

      repositoryMock.rejectChange.mockResolvedValue({
        event_id: 'evt-1',
        status: 'detected',
        confirmation_state: 'REJECTED_BY_CUSTOMER',
      });

      const result = await service.rejectChange('evt-1', 'cust-1', 'not valid');

      expect(result).toBeDefined();
      expect(result.confirmation_state).toBe('REJECTED_BY_CUSTOMER');
      expect(repositoryMock.rejectChange).toHaveBeenCalled();
    });
  });

  describe('State transition validation', () => {
    const validStates = [
      'DETECTED',
      'CONFIRMED_BY_CUSTOMER',
      'REJECTED_BY_CUSTOMER',
      'AUTO_APPROVED',
    ];

    validStates.forEach((state) => {
      it(`should reject confirm when state is ${state} (not CAREGIVER_UPDATED)`, async () => {
        repositoryMock.getEventWithContext.mockResolvedValue({
          event_id: 'evt-1',
          confirmation_state: state,
          cameras: { camera_name: 'Camera 1' },
        });

        await expect(service.confirmChange('evt-1', 'cust-1')).rejects.toThrow(ConflictException);
      });

      it(`should reject reject when state is ${state} (not CAREGIVER_UPDATED)`, async () => {
        repositoryMock.getEventWithContext.mockResolvedValue({
          event_id: 'evt-1',
          confirmation_state: state,
          cameras: { camera_name: 'Camera 1' },
        });

        await expect(service.rejectChange('evt-1', 'cust-1')).rejects.toThrow(ConflictException);
      });
    });
  });
});
