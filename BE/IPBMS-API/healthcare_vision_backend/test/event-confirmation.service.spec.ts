import { EventConfirmationService } from '../src/application/services/event-confirmation.service';

describe('EventConfirmationService', () => {
  let prismaMock: any;
  let notificationsMock: any;
  let repositoryMock: any;
  let svc: EventConfirmationService;

  beforeEach(() => {
    // basic tx mock that will call the callback with a tx object
    prismaMock = {
      $transaction: jest.fn(async (fn: any) => {
        // tx methods used by service
        const tx = {
          event_detections: {
            findUnique: jest.fn(),
            update: jest.fn(),
            findMany: jest.fn(),
          },
          alerts: { findFirst: jest.fn() },
          $executeRaw: jest.fn(),
          $executeRawUnsafe: jest.fn(),
          $queryRaw: jest.fn().mockResolvedValue([]),
        } as any;
        return fn(tx);
      }),
      // used by autoApprovePending: direct call (this.prisma as any).event_detections.findMany
      event_detections: {
        findMany: jest.fn(),
      },
    } as any;

    notificationsMock = {
      create: jest.fn(),
    } as any;

    repositoryMock = {
      proposeChange: jest.fn(),
      getEventWithContext: jest.fn(),
      eventExists: jest.fn(),
      getUserFullName: jest.fn().mockResolvedValue('Test User'),
      confirmChange: jest.fn(),
      rejectChange: jest.fn(),
      findExpiredProposals: jest.fn().mockResolvedValue([]),
      autoApproveProposal: jest.fn(),
    } as any;

    svc = new EventConfirmationService(
      prismaMock as any,
      repositoryMock as any,
      notificationsMock as any,
    );
  });

  it('proposeChange should update event and call NotificationsService.create when available', async () => {
    const eventId = 'evt-1';
    const caregiverId = 'care-1';
    const newStatus = 'false_alarm';

    // Mock repository methods
    repositoryMock.proposeChange.mockResolvedValue({
      event_id: eventId,
      proposed_status: newStatus,
      user_id: 'cust-1',
      detected_at: new Date(),
      status: 'detected',
    });

    repositoryMock.getEventWithContext.mockResolvedValue({
      event_id: eventId,
      detected_at: new Date(),
      cameras: { camera_name: 'Camera 1', location_in_room: 'Living Room' },
      snapshots: { files: [{ cloud_url: 'http://example.com/img.jpg' }] },
    });

    const updated = await svc.proposeChange(eventId, caregiverId, newStatus, 1000);

    expect(updated).toBeDefined();
    expect(repositoryMock.proposeChange).toHaveBeenCalled();
    expect(notificationsMock.create).toHaveBeenCalled();
    expect((updated as any).proposed_status).toBe(newStatus);
  });

  it('confirmChange should apply proposed_status to status', async () => {
    const eventId = 'evt-2';
    const customerId = 'cust-2';

    // Mock repository methods
    repositoryMock.getEventWithContext.mockResolvedValue({
      event_id: eventId,
      confirmation_state: 'CAREGIVER_UPDATED',
      proposed_status: 'resolved',
      proposed_event_type: 'fall',
      proposed_by: 'caregiver-1',
    });

    repositoryMock.confirmChange.mockResolvedValue({
      event_id: eventId,
      status: 'resolved',
      event_type: 'fall',
      confirmation_state: 'CONFIRMED_BY_CUSTOMER',
      acknowledged_by: customerId,
    });

    const updated = await svc.confirmChange(eventId, customerId);
    expect(updated).toBeDefined();
    expect((updated as any).status).toBe('resolved');
    expect((updated as any).confirmation_state).toBe('CONFIRMED_BY_CUSTOMER');
    expect((updated as any).acknowledged_by).toBe(customerId);
  });

  it('autoApprovePending should update pending events and return structured result', async () => {
    const mockExpiredEvents = [
      {
        event_id: 'evt-1',
        proposed_status: 'false_alarm',
        proposed_by: 'care-1',
        confirmation_state: 'CAREGIVER_UPDATED',
        pending_until: new Date(Date.now() - 1000),
        user_id: 'user-1',
      },
      {
        event_id: 'evt-2',
        proposed_status: 'confirmed',
        proposed_by: 'care-2',
        confirmation_state: 'CAREGIVER_UPDATED',
        pending_until: new Date(Date.now() - 2000),
        user_id: 'user-2',
      },
    ];

    repositoryMock.findExpiredProposals.mockResolvedValue(mockExpiredEvents);
    repositoryMock.autoApproveProposal.mockImplementation(async (eventId: string) => {
      const ev = mockExpiredEvents.find((e) => e.event_id === eventId);
      if (!ev) return null;
      return {
        event_id: eventId,
        status: ev.proposed_status,
        event_type: 'fall',
        user_id: ev.user_id,
        confirmation_state: 'AUTO_APPROVED',
      };
    });
    repositoryMock.getEventWithContext.mockResolvedValue(null);

    const result = await svc.autoApprovePending(10);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(result.events).toHaveLength(2);
    expect(result.events[0].event_id).toBe('evt-1');
    expect(result.events[0].status).toBe('false_alarm');
    expect(result.events[1].event_id).toBe('evt-2');
    expect(result.events[1].status).toBe('confirmed');
    expect(repositoryMock.findExpiredProposals).toHaveBeenCalledWith(10);
    expect(repositoryMock.autoApproveProposal).toHaveBeenCalledTimes(2);
  });
});
