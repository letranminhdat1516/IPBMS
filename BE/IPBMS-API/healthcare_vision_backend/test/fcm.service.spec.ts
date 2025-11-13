import { FcmService } from '../src/application/services/fcm.service';

// Minimal mocks to instantiate FcmService without TypeORM runtime
const mockRepo: any = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((v) => v),
  save: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
  })),
};

const mockAssignmentsService: any = {
  listCaregiversOfCustomer: jest
    .fn()
    .mockResolvedValue([{ caregiver_id: 'cg-1' }, { caregiver_id: 'cg-2' }]),
};

const mockMessaging: any = {
  sendEachForMulticast: jest.fn().mockResolvedValue({
    successCount: 1,
    failureCount: 0,
    responses: [{ success: true }],
  }),
};

describe('FcmService (unit)', () => {
  let service: FcmService;
  let mockFcmCoreService: any;
  let mockFcmNotificationService: any;

  beforeEach(() => {
    // instantiate service with mocks
    mockFcmCoreService = {
      getAudienceTokensByUserIds: jest.fn().mockResolvedValue(['token-cust', 'token-cg-1']),
      getAudienceTokensGroupedByUser: jest.fn().mockResolvedValue({
        tokens: ['token-cust', 'token-cg-1'],
        map: { 'cust-1': ['token-cust'], 'cg-1': ['token-cg-1'] },
      }),
      getCaregiverUserIdsForCustomer: jest.fn().mockResolvedValue(['cg-1', 'cg-2']),
      filterDeliverableTargets: jest
        .fn()
        .mockImplementation(async (fromUserId: string, toUserIds: string[], direction: string) => {
          if (direction === 'customer_to_caregiver') {
            return toUserIds.filter((id: string) => id === 'cg-1');
          } else if (direction === 'caregiver_to_customer') {
            return toUserIds.filter((id: string) => id === 'cust-2');
          }
          return [];
        }),
      sendMulticast: jest.fn().mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        responses: [{ success: true }, { success: true }],
      }),
    };
    mockFcmNotificationService = {
      pushSystemEvent: jest.fn().mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        responses: [],
        noTokenRecipients: [],
      }),
      pushActorMessage: jest.fn().mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [],
        tokensMap: { 'user-b': ['tok1'] },
      }),
      sendNotificationToUser: jest.fn(),
    };
    const mockFcmTokenService = {};
    const mockFcmAdminService = {};

    service = new FcmService(
      mockRepo as any,
      mockAssignmentsService as any,
      mockMessaging as any,
      mockFcmCoreService as any,
      mockFcmTokenService as any,
      mockFcmNotificationService as any,
      mockFcmAdminService as any,
    );
  });

  it('pushSystemEvent should delegate to FcmNotificationService', async () => {
    const input = {
      eventId: 'evt-1',
      eventType: 'fall',
      title: 'Test',
      body: 'Detected fall',
    };

    const result = await service.pushSystemEvent('cust-1', input);

    expect(mockFcmNotificationService.pushSystemEvent).toHaveBeenCalledWith('cust-1', input);
    expect(result).toEqual({
      successCount: 2,
      failureCount: 0,
      responses: [],
      noTokenRecipients: [],
    });
  });

  it('pushActorMessage should delegate to FcmNotificationService', async () => {
    const params = {
      fromUserId: 'user-a',
      toUserIds: ['user-b'],
      direction: 'customer_to_caregiver' as any,
      category: 'help' as any,
      message: 'Please help',
    };

    const result = await service.pushActorMessage(params);

    expect(mockFcmNotificationService.pushActorMessage).toHaveBeenCalledWith(params);
    expect(result).toEqual({
      successCount: 1,
      failureCount: 0,
      responses: [],
      tokensMap: { 'user-b': ['tok1'] },
    });
  });

  it('filterDeliverableTargets should return allowed ids for both directions', async () => {
    const allowedCaregivers = await service.filterDeliverableTargets(
      'cust-1',
      ['cg-1', 'cg-x'],
      'customer_to_caregiver',
    );
    expect(allowedCaregivers).toEqual(['cg-1']);

    const allowedCustomers = await service.filterDeliverableTargets(
      'cg-1',
      ['cust-2', 'cust-x'],
      'caregiver_to_customer',
    );
    expect(allowedCustomers).toEqual(['cust-2']);
  });
});
