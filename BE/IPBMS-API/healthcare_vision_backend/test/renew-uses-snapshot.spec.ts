import { SubscriptionService } from '@/application/services/subscription/subscription.service';

describe('renew uses plan_snapshot', () => {
  it('passes subscription.plan_snapshot (converted) into createVnpayPayment when present', async () => {
    // Arrange: create a subscription object that includes a plan_snapshot with BigInt values
    const userId = 'user-1';
    const subscription = {
      subscription_id: 'sub-1',
      user_id: userId,
      plan_code: 'premium',
      plans: { name: 'Premium Plan', code: 'premium' },
      // Raw snapshot stored in DB (BigInt for minor units)
      plan_snapshot: {
        code: 'premium',
        name: 'Premium Plan',
        unit_amount_minor: 123000n,
        currency: 'VND',
      },
    } as any;

    // Mocks for constructor dependencies (only what's required by requestManualRenewal)
    const mockPrismaService = {
      subscriptions: { findFirst: jest.fn().mockResolvedValue(subscription) },
      payments: { findFirst: jest.fn().mockResolvedValue(null) },
    } as any;
    const mockSubscriptionRepository = {} as any;
    const mockTransactionRepository = {} as any;
    const mockPaymentRepository = {} as any;
    const mockPlanRepository = { findByCode: jest.fn().mockResolvedValue(null) } as any;
    const mockSubscriptionEventRepository = {} as any;
    const mockSubscriptionUpgradeService = {} as any;
    const mockSubscriptionDowngradeService = {} as any;
    const mockNotificationService = {} as any;

    // paymentService mock to capture the 4th argument (planSnapshotParam)
    const mockPaymentService = {
      createVnpayPayment: jest
        .fn()
        .mockResolvedValue({ paymentId: 'p-1', paymentUrl: 'https://pay' }),
    } as any;

    // Instantiate service with mocks
    const service = new SubscriptionService(
      mockPrismaService,
      mockSubscriptionRepository,
      mockTransactionRepository,
      mockPaymentRepository,
      mockPlanRepository,
      mockSubscriptionEventRepository,
      mockSubscriptionUpgradeService,
      mockSubscriptionDowngradeService,
      mockNotificationService,
      undefined,
      mockPaymentService,
    );

    // Act
    const result = await service.requestManualRenewal(userId);

    // Assert: createVnpayPayment called and the 4th argument includes converted unit_amount_minor as string
    expect(mockPaymentService.createVnpayPayment).toHaveBeenCalled();
    const callArgs = mockPaymentService.createVnpayPayment.mock.calls[0];
    // fourth argument is the plan snapshot passed through convertBigIntToString
    const passedSnapshot = callArgs[3];
    expect(passedSnapshot).toBeDefined();
    // BigInt should be converted to string by the service before passing
    expect(passedSnapshot.unit_amount_minor).toBe('123000');
    expect(passedSnapshot.name).toBe('Premium Plan');
    // And result should contain paymentId returned by mock
    expect(result.paymentId).toBe('p-1');
  });
});
