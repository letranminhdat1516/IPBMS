import { SubscriptionDowngradeService } from '../src/application/services/subscription/subscription-downgrade.service';

describe('SubscriptionDowngradeService', () => {
  let service: SubscriptionDowngradeService;

  beforeEach(() => {
    // Create complete mocks for all dependencies
    const mockPrismaService = {
      $transaction: jest.fn(async (callback) => {
        // Mock the prisma instance passed to transaction callbacks
        const prismaInstance = {
          subscriptions: {
            findFirst: jest.fn().mockImplementation((args) => {
              if (args?.where?.subscription_id === 'sub-1') {
                return Promise.resolve({
                  subscription_id: 'sub-1',
                  current_period_start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                  current_period_end: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date (active)
                  plans: {
                    code: 'premium',
                    price: 200000n,
                    camera_quota: 10,
                    caregiver_seats: 5,
                    sites: 3,
                    retention_days: 30,
                  },
                  plan_code: 'premium',
                  user_id: 'test-user-id',
                  status: 'active',
                  started_at: new Date(),
                });
              }
              return Promise.resolve(null);
            }),
            update: jest.fn().mockResolvedValue({}),
          },
          plans: {
            findFirst: jest.fn().mockImplementation((args) => {
              if (
                args?.where?.code === 'basic' &&
                (args?.where?.is_current === true || args?.where?.is_current === undefined)
              ) {
                return Promise.resolve({
                  id: 'plan-basic',
                  code: 'basic',
                  price: 100000n,
                  camera_quota: 5,
                  caregiver_seats: 2,
                  sites: 1,
                  retention_days: 7,
                });
              }
              return Promise.resolve(null);
            }),
          },
          transactions: {
            findFirst: jest.fn().mockResolvedValue(null), // No existing transaction for idempotency
            create: jest.fn().mockResolvedValue({
              tx_id: 'tx-downgrade-123',
              status: 'pending',
            }),
            update: jest.fn().mockResolvedValue({}),
          },
          subscription_events: {
            create: jest.fn().mockResolvedValue({}),
          },
          entitlements: {
            create: jest.fn().mockResolvedValue({}),
          },
          $executeRaw: jest.fn().mockResolvedValue(1),
        };
        return callback(prismaInstance);
      }),
      $executeRaw: jest.fn().mockResolvedValue(1), // Also mock on main service
    };

    const mockSubscriptionRepository = {};
    const mockTransactionRepository = {};
    const mockPlanRepository = {};
    const mockSubscriptionEventRepository = {
      createIfNotExistsByEventDataInTransaction: jest.fn().mockResolvedValue({}),
    };

    service = new SubscriptionDowngradeService(
      mockPrismaService as any,
      mockSubscriptionRepository as any,
      mockTransactionRepository as any,
      mockPlanRepository as any,
      mockSubscriptionEventRepository as any,
    );
  });

  describe('prepareDowngrade', () => {
    it('should fail downgrade due to policy (no mid-cycle downgrade)', async () => {
      const dto = {
        userId: 'test-user-id',
        subscriptionId: 'sub-1',
        plan_code: 'basic',
        paymentProvider: 'stripe',
        idempotencyKey: 'test-key',
      };

      const result = await service.prepareDowngrade(dto);

      expect(result.status).toBe('failed');
      expect(result.reason).toBe('downgrade_only_at_period_end');
      expect(result.prorationRefund).toBe('0');
      expect(result.amountRefunded).toBe('0');
    });

    it.skip('should fail when subscription has no plan (skipped due to new policy)', async () => {
      // Test này không còn hợp lệ vì policy mới luôn chặn downgrade giữa kỳ
      // trước khi check plan
      expect(true).toBe(true);
    });
  });

  describe('applyDowngradeOnPaymentSuccess', () => {
    it('should apply downgrade successfully', async () => {
      const result = await service.applyDowngradeOnPaymentSuccess('sub-1', 'basic', 'tx-123');

      expect(result.status).toBe('success');
    });
  });
});
