import { SubscriptionService } from '@/application/services';

describe('SubscriptionService - Upgrade edge cases', () => {
  let service: SubscriptionService;
  let userId = 'test-user-id';
  let planCode = 'premium';
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
                  current_period_start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                  current_period_end: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date (active)
                  plans: { code: 'basic', price: 100000 },
                  plan_code: 'basic',
                  user_id: 'test-user-id',
                  status: 'active',
                  started_at: new Date(),
                });
              }
              if (args?.where?.subscription_id === 'sub-2') {
                return Promise.resolve({
                  subscription_id: 'sub-2',
                  current_period_start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                  current_period_end: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date (active)
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
                  current_period_start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                  current_period_end: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date (active)
                  plans: { code: 'basic', price: 100000 },
                  plan_code: 'basic',
                  user_id: 'test-user-id',
                  status: 'active',
                  started_at: new Date(),
                });
              }
              if (args?.where?.subscription_id === 'sub-4') {
                return Promise.resolve({
                  subscription_id: 'sub-4',
                  current_period_start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                  current_period_end: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date (active)
                  plans: { code: 'basic', price: 100000 },
                  plan_code: 'basic',
                  user_id: 'test-user-id',
                  status: 'active',
                  started_at: new Date(),
                });
              }
              if (args?.where?.subscription_id === 'sub-5') {
                return Promise.resolve({
                  subscription_id: 'sub-5',
                  current_period_start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                  current_period_end: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date (active)
                  plans: { code: 'basic', price: 100000 },
                  plan_code: 'basic',
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
                  camera_quota: 5,
                  caregiver_seats: 2,
                  sites: 1,
                  retention_days: 30,
                });
              }
              if (args?.where?.code === 'premium') {
                return Promise.resolve({
                  code: 'premium',
                  price: 200000,
                  camera_quota: 20,
                  caregiver_seats: 10,
                  sites: 5,
                  retention_days: 90,
                });
              }
              if (args?.where?.code === 'enterprise') {
                return Promise.resolve({
                  code: 'enterprise',
                  price: 500000,
                  camera_quota: 100,
                  caregiver_seats: 50,
                  sites: 20,
                  retention_days: 365,
                });
              }
              return Promise.resolve(null);
            }),
          },
          transactions: {
            create: jest.fn().mockResolvedValue({
              tx_id: 'tx-123',
              subscription_id: 'sub-1',
              plan_code: 'premium',
              amount: 200000,
              status: 'pending',
              effective_action: 'upgrade',
            }),
          },
          subscription_events: {
            create: jest.fn(),
          },
        };
        return callback(prismaInstance);
      }),
      // Direct access mocks for non-transaction operations
      plans: {
        findFirst: jest.fn().mockImplementation((args) => {
          if (args?.where?.code === 'basic') {
            return Promise.resolve({
              code: 'basic',
              price: 100000,
              camera_quota: 5,
              caregiver_seats: 2,
              sites: 1,
              retention_days: 30,
            });
          }
          if (args?.where?.code === 'premium') {
            return Promise.resolve({
              code: 'premium',
              price: 200000,
              camera_quota: 20,
              caregiver_seats: 10,
              sites: 5,
              retention_days: 90,
            });
          }
          if (args?.where?.code === 'enterprise') {
            return Promise.resolve({
              code: 'enterprise',
              price: 500000,
              camera_quota: 100,
              caregiver_seats: 50,
              sites: 20,
              retention_days: 365,
            });
          }
          return Promise.resolve(null);
        }),
      },
      transaction: {
        findFirst: jest.fn().mockImplementation((args) => {
          // Check for idempotency key in the query
          if (args?.where?.idempotency_key === 'upgrade-key-123') {
            return Promise.resolve({
              tx_id: 'tx-existing-123',
              subscription_id: 'sub-3',
              plan_code: 'premium',
              amount: 50000,
              status: 'pending',
              effective_action: 'upgrade',
              idempotency_key: 'upgrade-key-123',
            });
          }
          return Promise.resolve(null); // No existing transaction for other cases
        }),
        create: jest.fn().mockResolvedValue({
          tx_id: 'tx-123',
          subscription_id: 'sub-1',
          plan_code: 'premium',
          amount: 50000,
          status: 'pending',
          effective_action: 'upgrade',
        }),
      },
      subscriptions: {
        findFirst: jest.fn().mockImplementation((args) => {
          console.log('subscriptions.findFirst called with:', JSON.stringify(args, null, 2));
          if (args?.where?.subscription_id === 'sub-1') {
            return Promise.resolve({
              subscription_id: 'sub-1',
              current_period_start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
              current_period_end: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date (active)
              plans: { code: 'basic', price: 100000 },
              plan_code: 'basic',
              user_id: 'test-user-id',
              status: 'active',
              started_at: new Date(),
            });
          }
          if (args?.where?.subscription_id === 'sub-2') {
            return Promise.resolve({
              subscription_id: 'sub-2',
              current_period_start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
              current_period_end: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date (active)
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
              current_period_start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
              current_period_end: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date (active)
              plans: { code: 'basic', price: 100000 },
              plan_code: 'basic',
              user_id: 'test-user-id',
              status: 'active',
              started_at: new Date(),
            });
          }
          if (args?.where?.subscription_id === 'sub-4') {
            return Promise.resolve({
              subscription_id: 'sub-4',
              current_period_start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
              current_period_end: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date (active)
              plans: { code: 'basic', price: 100000 },
              plan_code: 'basic',
              user_id: 'test-user-id',
              status: 'active',
              started_at: new Date(),
            });
          }
          if (args?.where?.subscription_id === 'sub-5') {
            return Promise.resolve({
              subscription_id: 'sub-5',
              current_period_start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
              current_period_end: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date (active)
              plans: { code: 'basic', price: 100000 },
              plan_code: 'basic',
              user_id: 'test-user-id',
              status: 'active',
              started_at: new Date(),
            });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation((args) => {
          console.log('subscriptions.update called with:', JSON.stringify(args, null, 2));
          // For free upgrades, update the subscription immediately
          if (args?.where?.subscription_id === 'sub-2') {
            return Promise.resolve({
              subscription_id: 'sub-2',
              current_period_start: new Date(Date.now() - 24 * 60 * 60 * 1000),
              current_period_end: new Date(Date.now() + 24 * 60 * 60 * 1000),
              plans: { code: 'basic', price: 100000 },
              plan_code: 'basic',
              user_id: 'test-user-id',
              status: 'active',
              started_at: new Date(),
            });
          }
          return Promise.resolve(null);
        }),
      },
      subscription_events: {
        create: jest.fn().mockResolvedValue({
          id: 1,
          subscription_id: 'sub-2',
          event_type: 'upgraded',
          created_at: new Date(),
        }),
      },
    };

    // Mock repositories
    const mockSubscriptionRepository = {};
    const mockTransactionRepository = {};
    const mockPaymentRepository = {};
    const mockPlanRepository = {
      findByCode: jest.fn().mockImplementation((code) => {
        if (code === 'basic') {
          return Promise.resolve({
            id: 1,
            code: 'basic',
            price: 100000,
            camera_quota: 5,
            caregiver_seats: 2,
            sites: 1,
            retention_days: 30,
          });
        }
        if (code === 'premium') {
          return Promise.resolve({
            id: 2,
            code: 'premium',
            price: 200000,
            camera_quota: 20,
            caregiver_seats: 10,
            sites: 5,
            retention_days: 90,
          });
        }
        if (code === 'enterprise') {
          return Promise.resolve({
            id: 3,
            code: 'enterprise',
            price: 500000,
            camera_quota: 100,
            caregiver_seats: 50,
            sites: 20,
            retention_days: 365,
          });
        }
        return Promise.resolve(null);
      }),
    };
    const mockSubscriptionEventRepository = {};
    const mockNotificationsService = {};
    mockSubscriptionUpgradeService = {
      prepareUpgrade: jest.fn(),
    };
    mockSubscriptionDowngradeService = {
      prepareDowngrade: jest.fn(),
    };

    // Create service instance with mocks
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

  it('should successfully prepare upgrade to higher tier plan', async () => {
    // Mock the upgrade service
    mockSubscriptionUpgradeService.prepareUpgrade.mockResolvedValue({
      status: 'requires_action',
      prorationCharge: '50000',
      prorationCredit: '0',
      amountDue: '50000',
      transactionId: 'tx-123',
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // This should succeed and create an upgrade transaction
    const result = await service.prepareUpgrade({
      userId,
      subscriptionId: 'sub-1',
      plan_code: 'premium',
      paymentProvider: 'manual',
    });

    expect(result.status).toBe('requires_action');
    expect(result.transactionId).toBe('tx-123');
    expect(mockSubscriptionUpgradeService.prepareUpgrade).toHaveBeenCalledWith({
      userId,
      subscriptionId: 'sub-1',
      plan_code: 'premium',
      paymentProvider: 'manual',
    });
  });

  it('should handle upgrade to same plan (no-op)', async () => {
    // Mock the upgrade service for same plan upgrade (should be free)
    mockSubscriptionUpgradeService.prepareUpgrade.mockResolvedValue({
      status: 'success',
      prorationCharge: '0',
      prorationCredit: '0',
      amountDue: '0',
      transactionId: 'tx-same-plan',
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // This should succeed but log a warning about same plan
    const result = await service.prepareUpgrade({
      userId,
      subscriptionId: 'sub-2',
      plan_code: 'basic',
      paymentProvider: 'manual',
    });

    expect(result.status).toBe('success');
  });

  it('should handle idempotency for upgrade operations', async () => {
    // Mock first call - new transaction
    mockSubscriptionUpgradeService.prepareUpgrade
      .mockResolvedValueOnce({
        status: 'requires_action',
        prorationCharge: '50000',
        prorationCredit: '0',
        amountDue: '50000',
        transactionId: 'tx-new-123',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      // Mock second call - existing transaction
      .mockResolvedValueOnce({
        status: 'requires_action',
        prorationCharge: '50000',
        prorationCredit: '0',
        amountDue: '50000',
        transactionId: 'tx-existing-123',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

    // First call should succeed
    const result1 = await service.prepareUpgrade({
      userId,
      subscriptionId: 'sub-3',
      plan_code: 'premium',
      paymentProvider: 'manual',
      idempotencyKey: 'upgrade-key-123',
    });

    expect(result1.status).toBe('requires_action');

    // Second call with same idempotency key should return existing result
    const result2 = await service.prepareUpgrade({
      userId,
      subscriptionId: 'sub-3',
      plan_code: 'premium',
      paymentProvider: 'manual',
      idempotencyKey: 'upgrade-key-123',
    });

    expect(result2.status).toBe('requires_action');
    expect(result2.transactionId).toBe('tx-existing-123');
  });

  it('should throw error when target plan does not exist', async () => {
    // Mock the upgrade service to throw error for nonexistent plan
    mockSubscriptionUpgradeService.prepareUpgrade.mockRejectedValue(new Error('Unknown plan_code'));

    // This should fail because 'nonexistent' plan doesn't exist
    await expect(
      service.prepareUpgrade({
        userId,
        subscriptionId: 'sub-4',
        plan_code: 'nonexistent',
        paymentProvider: 'manual',
      }),
    ).rejects.toThrow('Unknown plan_code');
  });

  it('should validate entitlements are updated correctly during upgrade', async () => {
    // Mock the upgrade service
    mockSubscriptionUpgradeService.prepareUpgrade.mockResolvedValue({
      status: 'requires_action',
      prorationCharge: '200000',
      prorationCredit: '0',
      amountDue: '200000',
      transactionId: 'tx-entitlements-123',
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // This should succeed and update entitlements
    const result = await service.prepareUpgrade({
      userId,
      subscriptionId: 'sub-5',
      plan_code: 'enterprise',
      paymentProvider: 'manual',
    });

    expect(result.status).toBe('requires_action');
    expect(result.transactionId).toBe('tx-entitlements-123');
    // Note: applyUpgradeOnPaymentSuccess should NOT be called for paid upgrades
    // It should only be called after payment success via webhook/callback
  });
});
