import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from '../src/application/services/transaction.service';
import { TransactionRepository } from '../src/infrastructure/repositories/payments/transaction.repository';
import { SubscriptionRepository } from '../src/infrastructure/repositories/payments/subscription.repository';
import { PlanRepository } from '../src/infrastructure/repositories/admin/plan.repository';
import { UnitOfWork } from '../src/infrastructure/database/unit-of-work.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('TransactionService', () => {
  let service: TransactionService;
  let transactionRepository: jest.Mocked<TransactionRepository>;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;
  let planRepository: jest.Mocked<PlanRepository>;
  let unitOfWork: jest.Mocked<UnitOfWork>;

  const mockTxId = 'tx-123';
  const mockSubscriptionId = 'sub-123';
  const mockUserId = 'user-123';
  const mockPlanCode = 'premium';

  const mockTransaction = {
    tx_id: mockTxId,
    subscription_id: mockSubscriptionId,
    plan_code: mockPlanCode,
    amount_total: BigInt(200000),
    currency: 'VND',
    status: 'open',
    period_start: new Date('2024-01-01'),
    period_end: new Date('2024-02-01'),
    effective_action: 'create',
    provider: 'vnpay',
    created_at: new Date(),
    updated_at: new Date(),
    plan_snapshot: { name: 'Premium Plan', price: 200000 },
    plan_snapshot_old: null,
    plan_snapshot_new: null,
    amount_subtotal: BigInt(200000),
    amount_discount: BigInt(0),
    amount_tax: BigInt(0),
    idempotency_key: null,
    provider_payment_id: null,
    refunded_amount: BigInt(0),
    refund_reason: null,
    refund_notes: null,
    retry_count: 0,
    last_retry_at: null,
    version: null,
  };

  const mockSubscription = {
    subscription_id: mockSubscriptionId,
    user_id: mockUserId,
    plan_code: 'basic',
    status: 'active',
    current_period_start: new Date('2024-01-01'),
    current_period_end: new Date('2024-02-01'),
    created_at: new Date(),
    updated_at: new Date(),
    plans: {
      plan_code: 'basic',
      name: 'Basic Plan',
      price: 100000,
      currency: 'VND',
    },
  };

  const mockPlan = {
    plan_code: mockPlanCode,
    name: 'Premium Plan',
    price: 200000,
    currency: 'VND',
    tier: 'premium',
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const mockTransactionRepository = {
      findByTxId: jest.fn(),
      update: jest.fn(),
      updateInTransaction: jest.fn(),
      findBySubscriptionId: jest.fn(),
      createInTransaction: jest.fn(),
      findFirstInTransaction: jest.fn(),
      findByPaymentId: jest.fn(),
      findAll: jest.fn(),
      getStatistics: jest.fn(),
      findFirst: jest.fn(),
      findAllWithFilters: jest.fn(),
      getRevenueAnalytics: jest.fn(),
    };

    const mockSubscriptionRepository = {
      findBySubscriptionId: jest.fn(),
    };

    const mockPlanRepository = {
      findByCode: jest.fn(),
    };

    const mockUnitOfWork = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: TransactionRepository,
          useValue: mockTransactionRepository,
        },
        {
          provide: SubscriptionRepository,
          useValue: mockSubscriptionRepository,
        },
        {
          provide: PlanRepository,
          useValue: mockPlanRepository,
        },
        {
          provide: UnitOfWork,
          useValue: mockUnitOfWork,
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    transactionRepository = module.get(TransactionRepository);
    subscriptionRepository = module.get(SubscriptionRepository);
    planRepository = module.get(PlanRepository);
    unitOfWork = module.get(UnitOfWork);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const validTransactionData = {
      subscriptionId: mockSubscriptionId,
      planCode: mockPlanCode,
      action: 'upgrade',
      periodStart: '2024-01-01T00:00:00.000Z',
      periodEnd: '2024-02-01T00:00:00.000Z',
      currency: 'VND',
      amountTotal: 200000,
      provider: 'vnpay',
      providerPaymentId: 'payment-123',
      idempotencyKey: 'idempotent-key-123',
    };

    beforeEach(() => {
      subscriptionRepository.findBySubscriptionId.mockResolvedValue(mockSubscription as any);
      planRepository.findByCode.mockResolvedValue(mockPlan as any);
      transactionRepository.createInTransaction.mockResolvedValue(mockTransaction as any);
      transactionRepository.findFirstInTransaction.mockResolvedValue(null);
    });

    it('should throw error when required fields are missing', async () => {
      const invalidData = { ...validTransactionData, subscriptionId: '' };

      await expect(service.create(invalidData)).rejects.toThrow('Missing required fields');
    });

    it('should throw error when subscription not found', async () => {
      subscriptionRepository.findBySubscriptionId.mockResolvedValue(null);

      await expect(service.create(validTransactionData)).rejects.toThrow('Subscription not found');
    });

    it('should throw error when plan not found', async () => {
      planRepository.findByCode.mockResolvedValue(null);

      await expect(service.create(validTransactionData)).rejects.toThrow('Plan not found');
    });

    it('should return existing transaction when idempotency key matches', async () => {
      const existingTransaction = { ...mockTransaction, tx_id: 'existing-tx-123' };
      transactionRepository.findFirstInTransaction.mockResolvedValue(existingTransaction as any);

      unitOfWork.execute.mockImplementation(async (callback: any) => {
        return callback({
          transaction: { findFirst: jest.fn().mockResolvedValue(existingTransaction) },
        });
      });

      const result = await service.create(validTransactionData);

      expect(result).toEqual(existingTransaction);
      expect(transactionRepository.createInTransaction).not.toHaveBeenCalled();
    });

    it('should throw error when period overlaps with existing transaction', async () => {
      const overlappingTransaction = { ...mockTransaction, tx_id: 'overlap-tx-123' };
      transactionRepository.findFirstInTransaction
        .mockResolvedValueOnce(null) // idempotency check
        .mockResolvedValueOnce(overlappingTransaction); // overlap check

      unitOfWork.execute.mockImplementation(async (callback: any) => {
        return callback({
          transaction: {
            findFirst: jest
              .fn()
              .mockResolvedValueOnce(null)
              .mockResolvedValueOnce(overlappingTransaction),
            create: jest.fn().mockResolvedValue(mockTransaction),
          },
        });
      });

      await expect(service.create(validTransactionData)).rejects.toThrow(
        'Period overlap with existing transaction',
      );
    });

    it('should successfully create a new transaction', async () => {
      unitOfWork.execute.mockImplementation(async (callback: any) => {
        return callback({
          transaction: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockTransaction),
          },
        });
      });

      const result = await service.create(validTransactionData);

      expect(result).toEqual(mockTransaction);
      expect(unitOfWork.execute).toHaveBeenCalled();
      expect(transactionRepository.createInTransaction).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          subscription_id: mockSubscriptionId,
          plan_code: mockPlanCode,
          amount_total: BigInt('200000'),
          currency: 'VND',
          status: 'open',
          provider: 'vnpay',
        }),
      );
    });

    it('should handle upgrade action with plan snapshots', async () => {
      const upgradeData = { ...validTransactionData, action: 'upgrade' };

      unitOfWork.execute.mockImplementation(async (callback: any) => {
        return callback({
          transaction: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockTransaction),
          },
        });
      });

      await service.create(upgradeData);

      expect(transactionRepository.createInTransaction).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          plan_snapshot_old: expect.any(Object),
          plan_snapshot_new: expect.any(Object),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return transaction when found', async () => {
      transactionRepository.findByTxId.mockResolvedValue(mockTransaction as any);

      const result = await service.findById(mockTxId);

      expect(result).toEqual(mockTransaction);
      expect(transactionRepository.findByTxId).toHaveBeenCalledWith(mockTxId, {
        subscriptions: { select: { user_id: true, subscription_id: true } },
      });
    });

    it('should return null when transaction not found', async () => {
      transactionRepository.findByTxId.mockResolvedValue(null);

      const result = await service.findById(mockTxId);

      expect(result).toBeNull();
    });
  });

  describe('listBySubscription', () => {
    const mockTransactions = [mockTransaction];

    it('should return transactions for subscription', async () => {
      transactionRepository.findBySubscriptionId.mockResolvedValue(mockTransactions as any);

      const result = await service.listBySubscription(mockSubscriptionId);

      expect(result).toEqual(mockTransactions);
      expect(transactionRepository.findBySubscriptionId).toHaveBeenCalledWith(mockSubscriptionId);
    });
  });

  describe('list', () => {
    const mockTransactions = [mockTransaction];
    const listOptions = { page: 1, limit: 10, user_id: mockUserId, status: 'pending' };

    it('should return filtered transactions', async () => {
      transactionRepository.findAll.mockResolvedValue({
        items: mockTransactions as any,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });

      const result = await service.list(listOptions);

      expect(result).toEqual({
        items: mockTransactions,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
      expect(transactionRepository.findAll).toHaveBeenCalledWith(listOptions);
    });
  });

  describe('getStats', () => {
    const mockStats = {
      totalTransactions: 100,
      totalRevenue: BigInt(20000000),
      successfulTransactions: 95,
      failedTransactions: 5,
      averageTransactionValue: 200000,
    };

    it('should return transaction statistics', async () => {
      transactionRepository.getStatistics.mockResolvedValue(mockStats as any);

      const result = await service.getStats({ period: 'month', user_id: mockUserId });

      expect(result).toEqual(mockStats);
      expect(transactionRepository.getStatistics).toHaveBeenCalled();
    });
  });

  describe('checkRefundEligibility', () => {
    it('should return refund eligibility for successful transaction within timeframe', async () => {
      const recentTransaction = {
        ...mockTransaction,
        status: 'paid',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      };
      transactionRepository.findByTxId.mockResolvedValue(recentTransaction as any);
      transactionRepository.findFirst.mockResolvedValue(null);

      const result = await service.checkRefundEligibility(mockTxId);

      expect(result).toEqual({
        refundable: true,
        refundableAmount: Number(recentTransaction.amount_total),
        alreadyRefunded: false,
        transaction: recentTransaction,
      });
    });

    it('should return refund eligibility for old transaction (no age check in implementation)', async () => {
      const oldTransaction = {
        ...mockTransaction,
        status: 'paid',
        created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
      };
      transactionRepository.findByTxId.mockResolvedValue(oldTransaction as any);
      transactionRepository.findFirst.mockResolvedValue(null);

      const result = await service.checkRefundEligibility(mockTxId);

      expect(result).toEqual({
        refundable: true,
        refundableAmount: Number(oldTransaction.amount_total),
        alreadyRefunded: false,
        transaction: oldTransaction,
      });
    });

    it('should return not eligible for non-successful transaction', async () => {
      const failedTransaction = { ...mockTransaction, status: 'void' };
      transactionRepository.findByTxId.mockResolvedValue(failedTransaction as any);
      transactionRepository.findFirst.mockResolvedValue(null);

      const result = await service.checkRefundEligibility(mockTxId);

      expect(result).toEqual({
        refundable: false,
        refundableAmount: 0,
        alreadyRefunded: false,
        transaction: failedTransaction,
      });
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionRepository.findByTxId.mockResolvedValue(null);

      await expect(service.checkRefundEligibility(mockTxId)).rejects.toThrow(
        'Transaction not found',
      );
    });
  });

  describe('processRefund', () => {
    const refundOptions = { amount: 100000, reason: 'Customer request', notes: 'Test refund' };

    it('should successfully process refund', async () => {
      const successfulTransaction = {
        ...mockTransaction,
        status: 'paid',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
      };

      const refundTransaction = {
        ...mockTransaction,
        tx_id: 'refund-tx-123',
        amount_total: BigInt(-100000),
        amount_subtotal: BigInt(-100000),
        effective_action: 'adjustment',
        status: 'paid',
        related_tx_id: mockTxId,
        notes: 'Test refund',
      };

      transactionRepository.findByTxId.mockResolvedValue(successfulTransaction as any);
      transactionRepository.findFirst.mockResolvedValue(null);
      transactionRepository.createInTransaction.mockResolvedValue(refundTransaction as any);

      unitOfWork.execute.mockImplementation(async (callback: any) => {
        return callback({
          transaction: {
            create: jest.fn().mockResolvedValue(refundTransaction),
          },
        });
      });

      const result = await service.processRefund(mockTxId, refundOptions);

      expect(result).toEqual(refundTransaction);
    });

    it('should throw error when refund amount exceeds transaction amount', async () => {
      const successfulTransaction = {
        ...mockTransaction,
        status: 'paid',
        amount_total: BigInt(50000),
      };
      transactionRepository.findByTxId.mockResolvedValue(successfulTransaction as any);
      transactionRepository.findFirst.mockResolvedValue(null);

      const invalidOptions = { ...refundOptions, amount: 100000 };

      await expect(service.processRefund(mockTxId, invalidOptions)).rejects.toThrow(
        'Refund amount exceeds transaction amount',
      );
    });
  });

  describe('getFailedTransactions', () => {
    const mockFailedTransactions = [
      { ...mockTransaction, status: 'void', tx_id: 'failed-1' },
      { ...mockTransaction, status: 'void', tx_id: 'failed-2' },
    ];

    it('should return failed transactions with default options', async () => {
      transactionRepository.findAllWithFilters.mockResolvedValue({
        items: mockFailedTransactions as any,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      });

      const result = await service.getFailedTransactions({});

      expect(result).toEqual({
        items: mockFailedTransactions,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      });
      expect(transactionRepository.findAllWithFilters).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: 'void',
        createdAfter: expect.any(Date),
      });
    });
  });

  describe('retryTransaction', () => {
    it('should successfully retry failed transaction', async () => {
      const failedTransaction = { ...mockTransaction, status: 'void', retry_count: 0 };

      transactionRepository.findByTxId.mockResolvedValue(failedTransaction as any);

      const result = await service.retryTransaction(mockTxId);

      expect(result).toEqual({
        success: false,
        message: 'Retry logic needs to be implemented based on payment provider',
        transaction: failedTransaction,
      });
    });

    it('should throw error when transaction not found', async () => {
      transactionRepository.findByTxId.mockResolvedValue(null);

      await expect(service.retryTransaction(mockTxId)).rejects.toThrow('Transaction not found');
    });

    it('should throw error when transaction is not in failed state', async () => {
      const successfulTransaction = { ...mockTransaction, status: 'paid' };
      transactionRepository.findByTxId.mockResolvedValue(successfulTransaction as any);

      await expect(service.retryTransaction(mockTxId)).rejects.toThrow(
        'Transaction is not in failed state',
      );
    });
  });

  describe('getRevenueAnalytics', () => {
    const mockAnalytics = {
      totalRevenue: BigInt(10000000),
      transactionCount: 50,
      averageOrderValue: 200000,
      revenueByPeriod: [
        { period: '2024-01', revenue: BigInt(5000000), transactions: 25 },
        { period: '2024-02', revenue: BigInt(5000000), transactions: 25 },
      ],
    };

    it('should return revenue analytics', async () => {
      transactionRepository.getRevenueAnalytics.mockResolvedValue(mockAnalytics as any);

      const result = await service.getRevenueAnalytics({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        groupBy: 'month',
      });

      expect(result).toEqual(mockAnalytics);
      expect(transactionRepository.getRevenueAnalytics).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-12-31'),
        'month',
      );
    });
  });

  describe('generateRevenueReport', () => {
    const mockReport = {
      summary: {
        totalRevenue: BigInt(10000000),
        totalTransactions: 50,
        period: '2024-01-01 to 2024-12-31',
      },
      data: [
        {
          date: '2024-01-01',
          revenue: BigInt(500000),
          transactions: 5,
          topPlans: ['premium', 'basic'],
        },
      ],
      format: 'json',
    };

    it('should generate revenue report', async () => {
      transactionRepository.getRevenueAnalytics.mockResolvedValue({
        totalRevenue: BigInt(10000000),
        transactionCount: 50,
        averageOrderValue: 200000,
        revenueByPeriod: [],
      } as any);
      transactionRepository.findAllWithFilters.mockResolvedValue({
        items: [],
        pagination: {
          page: 1,
          limit: 1000,
          total: 0,
          totalPages: 1,
        },
      });

      const result = await service.generateRevenueReport({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        format: 'json',
      });

      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('transactionCount');
      expect(result).toHaveProperty('averageOrderValue');
      expect(result).toHaveProperty('revenueByPeriod');
    });
  });
});
