import { EventsService } from '../src/application/services/events.service';

// Minimal mocks
const mockEventsRepo: any = {
  findByIdWithContext: jest.fn(),
  updateConfirm: jest.fn(),
};
const mockFcmService: any = { pushSystemEvent: jest.fn(), pushActorMessage: jest.fn() };
const mockCacheService: any = { deleteByPattern: jest.fn(), delete: jest.fn() };
const mockSettings: any = {};

describe('EventsService - customer final policy', () => {
  let svc: EventsService;

  beforeEach(() => {
    jest.resetAllMocks();
    svc = new EventsService(mockEventsRepo, mockSettings, mockFcmService, mockCacheService);
  });

  it('should block caregiver override when customer already confirmed', async () => {
    const eventId = 'evt-1';
    mockEventsRepo.findByIdWithContext.mockResolvedValue({
      event_id: eventId,
      user_id: 'user-1',
      acknowledged_by: 'user-1', // previously customer (store user id)
      event_type: 'fall',
    });

    await expect(
      svc.updateConfirm(eventId, true, 'ok', 'caregiver-id', 'caregiver'),
    ).rejects.toThrow(
      'Phê duyệt của khách hàng là quyết định cuối cùng; caregiver không được ghi đè',
    );

    expect(mockEventsRepo.updateConfirm).not.toHaveBeenCalled();
  });

  it('should allow customer to confirm even if caregiver had confirmed earlier', async () => {
    const eventId = 'evt-2';
    mockEventsRepo.findByIdWithContext.mockResolvedValue({
      event_id: eventId,
      user_id: 'user-2',
      acknowledged_by: 'caregiver-id',
      event_type: 'fall',
    });

    mockEventsRepo.updateConfirm.mockResolvedValue({ event_id: eventId, confirm_status: true });

    const res = await svc.updateConfirm(eventId, true, 'customer ok', 'user-2', 'customer');

    expect(mockEventsRepo.updateConfirm).toHaveBeenCalledWith(
      eventId,
      true,
      'customer ok',
      'user-2',
    );

    expect(res).toEqual({ event_id: eventId, confirm_status: true });
  });
});
