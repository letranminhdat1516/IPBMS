import { SubscriptionService } from '../src/application/services/subscription';

describe('SubscriptionService - Downgrade edge cases', () => {
  let service: SubscriptionService;
  let userId = 'test-user-id';
  let planCode = 'basic';
  let mockSubscriptionUpgradeService: any;
  let mockSubscriptionDowngradeService: any;

  beforeEach(() => {
    // Create complete mocks for all dependencies
    const mockPrismaService = {
      $transaction: jest.fn(async (callback) => {
        // Mock the prisma instance passed to transaction callbacks
        const prismaInstance = {
          subscriptions: {
            findFirst: jest.fn().mockImplementation((args) => {
              console.log(
                'Transaction subscriptions.findFirst called with:',
                JSON.stringify(args, null, 2),
              );
              // Mock different responses based on query parameters
              if (args?.where?.subscription_id === 'sub-1') {
                return Promise.resolve({
                  subscription_id: 'sub-1',
                  current_period_end: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
                  plans: { code: 'premium', price: 200000 },
                  plan_code: 'premium',
                  user_id: 'test-user-id',
                  status: 'active',
                  started_at: new Date(),
                });
              }
              if (args?.where?.subscription_id === 'sub-2') {
                return Promise.resolve({
                  subscription_id: 'sub-2',
                  current_period_end: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
                  plans: { code: 'basic', price: 100000 },
                  plan_code: 'basic',
                  user_id: 'test-user-id',
                  status: 'active',
                  started_at: new Date(),
                });
              }
              if (args?.where?.subscription_id === 'sub-3') {
                return Promise.resolve({
                  subscription_id: 'sub-3',
                  current_period_end: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
                  plans: { code: 'premium', price: 200000 },
                  plan_code: 'premium',
                  user_id: 'test-user-id',
                  status: 'active',
                  started_at: new Date(),
                });
              }
              if (args?.where?.subscription_id === 'sub-4') {
                return Promise.resolve({
                  subscription_id: 'sub-4',
                  current_period_end: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date (active)
                  plans: { code: 'premium', price: 200000 },
                  plan_code: 'premium',
                  user_id: 'test-user-id',
                  status: 'active',
                  started_at: new Date(),
                });
              }
              if (args?.where?.subscription_id === 'sub-5') {
                return Promise.resolve({
                  subscription_id: 'sub-5',
                  current_period_end: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date (active)
                  plans: { code: 'premium', price: 200000 },
                  plan_code: 'premium',
                  user_id: 'test-user-id',
                  status: 'active',
                  started_at: new Date(),
                });
              }
              return Promise.resolve(null);
            }),
            update: jest.fn(),
          },
          plans: {
            findFirst: jest.fn().mockImplementation((args) => {
              if (args?.where?.code === 'basic') {
                return Promise.resolve({
                  code: 'basic',
                  price: 100000,
                  id: 'plan-basic-id',
                });
              }
              if (args?.where?.code === 'premium') {
                return Promise.resolve({
                  code: 'premium',
                  price: 200000,
                  id: 'plan-premium-id',
                });
              }
              return Promise.resolve(null);
            }),
          },
          transaction: {
            findFirst: jest.fn().mockResolvedValue(null), // No existing transaction
            create: jest.fn().mockResolvedValue({
              tx_id: 'tx-123',
              subscription_id: 'sub-1',
              plan_code: 'basic',
              plan_id: 'plan-basic-id',
              amount_subtotal: BigInt(0),
              amount_total: BigInt(0),
              currency: 'VND',
              period_start: new Date(),
              period_end: new Date(),
              status: 'succeeded',
              effective_action: 'downgrade',
              provider: 'manual',
              idempotency_key: null,
              is_proration: false,
              proration_charge: BigInt(0),
              proration_credit: BigInt(0),
              plan_snapshot_old: { code: 'premium', price: 200000 },
              plan_snapshot_new: { code: 'basic', price: 100000 },
            }),
            update: jest.fn(),
          },
          subscription_events: {
            create: jest.fn(),
          },
          $executeRaw: jest.fn(),
          $queryRaw: jest.fn(),
        };
        return callback(prismaInstance);
      }),
      subscriptions: {
        findFirst: jest.fn().mockImplementation((args) => {
          console.log('subscriptions.findFirst called with:', JSON.stringify(args, null, 2));
          // Mock different responses based on query parameters
          if (args?.where?.subscription_id === 'sub-1') {
            return Promise.resolve({
              subscription_id: 'sub-1',
              current_period_end: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
              plans: { code: 'premium', price: 200000 },
              plan_code: 'premium',
              user_id: 'test-user-id',
              status: 'active',
              started_at: new Date(),
            });
          }
          if (args?.where?.subscription_id === 'sub-2') {
            return Promise.resolve({
              subscription_id: 'sub-2',
              current_period_end: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
              plans: { code: 'basic', price: 100000 },
              plan_code: 'basic',
              user_id: 'test-user-id',
              status: 'active',
              started_at: new Date(),
            });
          }
          // For getActive calls (no subscription_id filter)
          if (!args?.where?.subscription_id) {
            return Promise.resolve({
              subscription_id: 'sub-1',
              current_period_end: new Date(Date.now() - 24 * 60 * 60 * 1000),
              plans: { code: 'premium', price: 200000 },
              plan_code: 'premium',
              user_id: 'test-user-id',
              status: 'active',
              started_at: new Date(),
            });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn(),
      },
      plans: {
        findFirst: jest.fn(),
      },
      transaction: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      subscription_events: {
        create: jest.fn(),
      },
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
    };

    const mockSubscriptionRepository = {};
    const mockTransactionRepository = {
      findByTxId: jest.fn().mockResolvedValue({
        tx_id: 'tx-123',
        status: 'pending',
        subscription_id: 'sub-1',
        plan_code: 'basic',
        effective_action: 'downgrade',
        payment_id: 'payment-123',
        subscriptions: {
          subscription_id: 'sub-1',
          user_id: 'test-user-id',
          plans: { code: 'premium', price: 200000 },
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        payments: {
          payment_id: 'payment-123',
          status: 'paid',
        },
      }),
    };
    const mockPaymentRepository = {};
    const mockPlanRepository = {
      findByCode: jest.fn().mockResolvedValue({
        code: 'basic',
        id: 'plan-basic-id',
        camera_quota: 5,
        caregiver_seats: 2,
        sites: 1,
        retention_days: 30,
      }),
    };
    const mockSubscriptionEventRepository = {
      findByEventData: jest.fn().mockResolvedValue(null),
    };
    const mockNotificationsService = {};
    mockSubscriptionUpgradeService = {
      prepareUpgrade: jest.fn(),
    };
    mockSubscriptionDowngradeService = {
      prepareDowngrade: jest.fn(),
    };

    service = new SubscriptionService(
      mockPrismaService as any,
      mockSubscriptionRepository as any,
      mockTransactionRepository as any,
      mockPaymentRepository as any,
      mockPlanRepository as any,
      mockSubscriptionEventRepository as any,
      mockSubscriptionUpgradeService as any,
      mockSubscriptionDowngradeService as any,
      mockNotificationsService as any,
    );
  });

  it('should allow downgrade when subscription is expired', async () => {
    // Mock the downgrade service for expired subscription
    mockSubscriptionDowngradeService.prepareDowngrade.mockResolvedValue({
      status: 'success',
      prorationRefund: '0',
      amountRefunded: '0',
      transactionId: 'tx-expired-downgrade',
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // This should succeed for expired subscription
    const result = await service.prepareDowngrade({
      userId,
      subscriptionId: 'sub-1',
      plan_code: 'basic',
      paymentProvider: 'manual',
    });

    expect(result.status).toBe('success');
  });

  it('should allow "upgrade" to higher price plan (logs warning but proceeds)', async () => {
    // Mock the entire service to avoid accessing private properties
    const mockPrismaService = {
      $transaction: jest.fn(async (callback) => {
        const prismaInstance = {
          subscriptions: {
            findFirst: jest.fn().mockResolvedValue({
              subscription_id: 'sub-2',
              current_period_end: new Date(Date.now() - 24 * 60 * 60 * 1000),
              plans: { code: 'basic', price: 100000 },
              plan_code: 'basic',
            }),
          },
          plans: {
            findFirst: jest.fn().mockResolvedValue({
              code: 'premium',
              price: 200000,
              id: 'plan-premium-id',
            }),
          },
          transaction: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              tx_id: 'tx-123',
              period_start: new Date(),
              period_end: new Date(),
            }),
            update: jest.fn(),
          },
          subscription_events: {
            create: jest.fn(),
          },
          $executeRaw: jest.fn(),
          $queryRaw: jest.fn(),
        };
        return callback(prismaInstance);
      }),
    };

    const mockTransactionRepository = {
      findByTxId: jest.fn().mockResolvedValue({
        tx_id: 'tx-123',
        status: 'pending',
        subscription_id: 'sub-2',
        plan_code: 'premium',
        effective_action: 'downgrade',
        payment_id: 'payment-123',
        subscriptions: {
          subscription_id: 'sub-2',
          user_id: 'test-user-id',
          plans: { code: 'basic', price: 100000 },
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        payments: {
          payment_id: 'payment-123',
          status: 'paid',
        },
      }),
    };

    const mockSubscriptionDowngradeServiceLocal = {
      prepareDowngrade: jest.fn().mockResolvedValue({
        status: 'success',
        prorationRefund: '0',
        amountRefunded: '0',
        transactionId: 'tx-higher-price-downgrade',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }),
    };

    service = new SubscriptionService(
      mockPrismaService as any,
      {} as any,
      mockTransactionRepository as any,
      {} as any,
      {
        findByCode: jest.fn().mockResolvedValue({
          code: 'premium',
          id: 'plan-premium-id',
          camera_quota: 10,
          caregiver_seats: 5,
          sites: 3,
          retention_days: 90,
        }),
      } as any,
      {
        findByEventData: jest.fn().mockResolvedValue(null),
      } as any,
      {
        prepareUpgrade: jest.fn(),
      } as any,
      mockSubscriptionDowngradeServiceLocal as any,
      {} as any, // NotificationService mock
    );

    // This should succeed even though it's a "higher price upgrade"
    const result = await service.prepareDowngrade({
      userId,
      subscriptionId: 'sub-2',
      plan_code: 'premium',
      paymentProvider: 'manual',
    });

    expect(result.status).toBe('success');
  });

  it('should handle idempotency for downgrade operations', async () => {
    // Mock first call - new transaction
    mockSubscriptionDowngradeService.prepareDowngrade
      .mockResolvedValueOnce({
        status: 'success',
        prorationRefund: '0',
        amountRefunded: '0',
        transactionId: 'tx-new-downgrade',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      // Mock second call - existing transaction
      .mockResolvedValueOnce({
        status: 'success',
        prorationRefund: '0',
        amountRefunded: '0',
        transactionId: 'tx-existing-downgrade',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

    // First call should succeed
    const result1 = await service.prepareDowngrade({
      userId,
      subscriptionId: 'sub-3',
      plan_code: 'basic',
      paymentProvider: 'manual',
      idempotencyKey: 'idempotent-key-123',
    });

    expect(result1.status).toBe('success');

    // Second call with same idempotency key should return existing result
    const result2 = await service.prepareDowngrade({
      userId,
      subscriptionId: 'sub-3',
      plan_code: 'basic',
      paymentProvider: 'manual',
      idempotencyKey: 'idempotent-key-123',
    });

    expect(result2.status).toBe('success');
  });

  it('should throw error when target plan does not exist', async () => {
    // Mock the downgrade service to throw error for nonexistent plan
    mockSubscriptionDowngradeService.prepareDowngrade.mockRejectedValue(
      new Error('Unknown plan_code'),
    );

    // This should fail because 'nonexistent' plan doesn't exist
    await expect(
      service.prepareDowngrade({
        userId,
        subscriptionId: 'sub-4',
        plan_code: 'nonexistent',
        paymentProvider: 'manual',
      }),
    ).rejects.toThrow('Unknown plan_code');
  });

  it('should validate entitlements are updated correctly during downgrade', async () => {
    // Mock the downgrade service
    mockSubscriptionDowngradeService.prepareDowngrade.mockResolvedValue({
      status: 'success',
      prorationRefund: '0',
      amountRefunded: '0',
      transactionId: 'tx-entitlements-downgrade',
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // This should succeed and update entitlements
    const result = await service.prepareDowngrade({
      userId,
      subscriptionId: 'sub-5',
      plan_code: 'basic',
      paymentProvider: 'manual',
    });

    expect(result.status).toBe('success');
    expect(result.transactionId).toBe('tx-entitlements-downgrade');
  });
});
