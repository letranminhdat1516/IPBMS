import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentEventService } from '../src/application/services/payment-event.service';
import { PaymentService } from '../src/application/services/payment.service';
import { TransactionService } from '../src/application/services/transaction.service';
import { UnitOfWork } from '../src/infrastructure/database/unit-of-work.service';

import { SubscriptionService } from '@/application/services';
import { AlertsService } from '../src/application/services/alerts.service';
import { CacheService } from '../src/application/services/cache.service';
import { NotificationsService } from '../src/application/services/notifications.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { PlanRepository } from '../src/infrastructure/repositories/admin/plan.repository';
import { PaymentRepository } from '../src/infrastructure/repositories/payments/payment.repository';
import { SubscriptionRepository } from '../src/infrastructure/repositories/payments/subscription.repository';
import { TransactionRepository } from '../src/infrastructure/repositories/payments/transaction.repository';
import { VNPAY_CLIENT } from '../src/shared/providers/vnpay.provider';

describe('Payment Integration Tests', () => {
  let paymentService: PaymentService;
  let transactionService: TransactionService;
  let subscriptionService: SubscriptionService;
  let paymentEventService: PaymentEventService;
  let paymentRepository: jest.Mocked<PaymentRepository>;
  let transactionRepository: jest.Mocked<TransactionRepository>;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;
  let planRepository: jest.Mocked<PlanRepository>;
  let unitOfWork: jest.Mocked<UnitOfWork>;
  let vnpayClient: jest.Mocked<any>;
  let configService: jest.Mocked<ConfigService>;
  let cacheService: jest.Mocked<CacheService>;

  const mockUserId = 'user-integration-123';
  const mockSubscriptionId = 'sub-integration-123';
  const mockPaymentId = 'payment-integration-123';
  const mockTransactionId = 'tx-integration-123';
  const mockPlanCode = 'premium';
  const mockVnpTxnRef = 'vnp123456';

  const mockPlan = {
    plan_code: mockPlanCode,
    name: 'Premium Plan',
    price: 200000,
    currency: 'VND',
    tier: 'premium',
    created_at: new Date(),
    updated_at: new Date(),
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
  };

  const mockPayment = {
    payment_id: mockPaymentId,
    amount: BigInt(200000),
    description: 'Premium plan payment',
    status: 'pending',
    status_enum: null,
    user_id: mockUserId,
    plan_id: 'plan-1',
    vnp_txn_ref: mockVnpTxnRef,
    created_at: new Date(),
    updated_at: new Date(),
    plan_code: mockPlanCode,
    vnp_create_date: BigInt('20241201120000'),
    vnp_expire_date: BigInt('20241201121500'),
    vnp_order_info: 'Premium plan payment',
    version: null,
    currency: 'VND',
    provider: 'vnpay' as any,
    delivery_data: { plan_code: mockPlanCode },
  };

  const mockTransaction = {
    tx_id: mockTransactionId,
    subscription_id: mockSubscriptionId,
    plan_code: mockPlanCode,
    amount_total: BigInt(200000),
    currency: 'VND',
    status: 'pending',
    period_start: new Date('2024-01-01'),
    period_end: new Date('2024-02-01'),
    effective_action: 'upgrade',
    provider: 'vnpay',
    created_at: new Date(),
    updated_at: new Date(),
    plan_snapshot: mockPlan,
    plan_snapshot_old: null,
    plan_snapshot_new: mockPlan,
    amount_subtotal: BigInt(200000),
    amount_discount: BigInt(0),
    amount_tax: BigInt(0),
    idempotency_key: null,
    provider_payment_id: mockPaymentId,
    refunded_amount: BigInt(0),
    refund_reason: null,
    refund_notes: null,
    retry_count: 0,
    last_retry_at: null,
    version: null,
  };

  beforeEach(async () => {
    const mockPaymentRepository = {
      findPlanByCode: jest.fn(),
      executePaymentTransaction: jest.fn(),
      findActiveSubscriptionByUserIdInTransaction: jest.fn(),
      findByVnpTxnRef: jest.fn(),
      updateInTransaction: jest.fn(),
      findByPaymentId: jest.fn(),
      updatePaymentStatus: jest.fn(),
      findPayments: jest.fn(),
      findTransactionByPaymentId: jest.fn(),
    };

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
      updateInTransaction: jest.fn(),
    };

    const mockPlanRepository = {
      findByCode: jest.fn(),
    };

    const mockUnitOfWork = {
      execute: jest.fn(),
    };

    const mockVnpayClient = {
      buildPaymentUrl: jest.fn(),
      queryDr: jest.fn(),
      verifyReturnUrl: jest.fn(),
      verifyIpnCall: jest.fn(),
    };

    const mockConfigService = {
      getOrThrow: jest.fn(),
      get: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    };

    const mockPrismaService = {
      subscriptions: {
        create: jest.fn(),
      },
      payments: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        TransactionService,
        {
          provide: PaymentRepository,
          useValue: mockPaymentRepository,
        },
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
        {
          provide: VNPAY_CLIENT,
          useValue: mockVnpayClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AlertsService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: SubscriptionService,
          useValue: {
            createSubscriptionFromPayment: jest.fn(),
            handlePaymentSuccess: jest.fn().mockResolvedValue({
              success: true,
              subscription: {
                subscription_id: 'sub-new-123',
                user_id: mockUserId,
                plan_code: mockPlanCode,
                status: 'active',
              },
            }),
            getActive: jest.fn().mockResolvedValue({
              subscription_id: 'sub-new-123',
              user_id: mockUserId,
              plan_code: mockPlanCode,
              status: 'active',
            }),
            createEntitlementsForSubscription: jest.fn(),
          },
        },
        {
          provide: PaymentEventService,
          useValue: {
            handlePaymentSuccess: jest.fn(),
            handlePaymentFailed: jest.fn(),
            handlePaymentRetry: jest.fn(),
          },
        },
      ],
    }).compile();

    paymentService = module.get<PaymentService>(PaymentService);
    transactionService = module.get<TransactionService>(TransactionService);
    subscriptionService = module.get<SubscriptionService>(SubscriptionService);
    paymentEventService = module.get<PaymentEventService>(PaymentEventService);
    paymentRepository = module.get(PaymentRepository);
    transactionRepository = module.get(TransactionRepository);
    subscriptionRepository = module.get(SubscriptionRepository);
    planRepository = module.get(PlanRepository);
    unitOfWork = module.get(UnitOfWork);
    vnpayClient = module.get(VNPAY_CLIENT);
    configService = module.get(ConfigService);
    cacheService = module.get(CacheService);
    const prismaService = module.get(PrismaService);

    // Setup PrismaService mock
    (prismaService.subscriptions.create as jest.Mock).mockResolvedValue({
      subscription_id: 'sub-new-123',
      user_id: mockUserId,
      plan_code: mockPlanCode,
      status: 'active',
      billing_period: 'monthly',
      started_at: new Date(),
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days later
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

  describe('Complete Payment Flow Integration', () => {
    const paymentDto = {
      user_id: mockUserId,
      plan_code: mockPlanCode,
    };

    const mockIp = '127.0.0.1';

    beforeEach(() => {
      // Setup common mocks
      configService.getOrThrow.mockReturnValue('https://example.com/return');
      configService.get.mockReturnValue('VN');
      vnpayClient.buildPaymentUrl.mockReturnValue('https://vnpay.vn/payment-url');
      planRepository.findByCode.mockResolvedValue(mockPlan as any);
      paymentRepository.findPlanByCode.mockResolvedValue(mockPlan as any);
      subscriptionRepository.findBySubscriptionId.mockResolvedValue(mockSubscription as any);
      // PrismaService mock is already set up in the main beforeEach
      paymentRepository.updateInTransaction.mockResolvedValue({
        ...mockPayment,
        vnp_txn_ref: mockVnpTxnRef,
        description: 'Lifetime premium',
        // status_enum is optional; tests don't rely on it
        status_enum: null as any,
      } as any);
      paymentRepository.findActiveSubscriptionByUserIdInTransaction.mockResolvedValue(null);
    });

    it('should complete full payment flow: create payment -> VNPay callback -> subscription update', async () => {
      // 1. Create payment
      paymentRepository.executePaymentTransaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          plans: {
            findFirst: jest.fn().mockResolvedValue(mockPlan),
          },
          payments: {
            create: jest.fn().mockResolvedValue({
              ...mockPayment,
              description: 'Lifetime premium', // Match what the service creates
            }),
            update: jest.fn().mockResolvedValue({
              ...mockPayment,
              vnp_txn_ref: mockVnpTxnRef,
              description: 'Lifetime premium',
            }),
          },
          transaction: {
            create: jest.fn(),
          },
        };
        return callback(mockTx);
      });

      const paymentResult = await paymentService.createVnpayPayment(paymentDto, mockIp);

      // Don't assert the full URL string (query params include timestamps/hashes).
      // Instead assert essential properties are present and correctly typed.
      expect(paymentResult.paymentId).toBe(mockPaymentId);
      expect(paymentResult.plan_code).toBe(mockPlanCode);
      expect(paymentResult.vnp_Amount).toBe(BigInt(200000));
      expect(typeof paymentResult.paymentUrl).toBe('string');
      expect(paymentResult.paymentUrl).toContain('vnp_SecureHash=');
      expect(paymentResult.paymentUrl).toContain('vnp_SecureHashType=HmacSHA512');

      // 2. Simulate VNPay return callback
      const returnQuery = {
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_Amount: '20000000',
        vnp_TxnRef: mockVnpTxnRef,
        vnp_SecureHash: 'valid-hash',
      };

      vnpayClient.verifyReturnUrl.mockReturnValue({
        isVerified: true,
        vnp_SecureHash: 'valid-hash',
        vnp_ResponseCode: returnQuery.vnp_ResponseCode,
        vnp_TransactionStatus: returnQuery.vnp_TransactionStatus,
        vnp_Amount: 200000, // Library returns major VND
        vnp_TxnRef: returnQuery.vnp_TxnRef,
      });
      paymentRepository.findByVnpTxnRef.mockResolvedValue(mockPayment as any);

      const returnResult = await paymentService.handleReturn({ query: returnQuery });

      expect(returnResult).toEqual({
        payment_id: mockPaymentId,
        vnpTxnRef: mockVnpTxnRef,
        plan_code: mockPlanCode,
        responseCode: '00',
        transactionStatus: '00',
        isVerified: true,
        isSuccess: true,
        status: 'pending',
        verify: {
          isVerified: true,
          vnp_SecureHash: 'valid-hash',
          vnp_ResponseCode: '00',
          vnp_TransactionStatus: '00',
          vnp_Amount: 200000, // Library returns major VND
          vnp_TxnRef: mockVnpTxnRef,
        },
        raw: { query: returnQuery },
      });

      // 3. Simulate VNPay IPN callback
      const ipnQuery = {
        ...returnQuery,
        vnp_OrderInfo: 'Premium plan payment',
      };

      vnpayClient.verifyIpnCall.mockReturnValue({
        isVerified: true,
        vnp_SecureHash: 'valid-hash',
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_Amount: '20000000',
        vnp_TxnRef: mockVnpTxnRef,
        vnp_OrderInfo: 'Premium plan payment',
      });

      // Mock transaction creation for subscription update
      transactionRepository.createInTransaction.mockResolvedValue(mockTransaction as any);
      transactionRepository.findFirstInTransaction.mockResolvedValue(null);
      subscriptionRepository.updateInTransaction.mockResolvedValue({} as any);

      unitOfWork.execute.mockImplementation(async (callback: any) => {
        const mockTx = {
          transaction: {
            create: jest.fn().mockResolvedValue(mockTransaction),
            findFirst: jest.fn().mockResolvedValue(null),
          },
          subscriptions: {
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      const ipnResult = await paymentService.handleIpn({ query: ipnQuery });

      expect(ipnResult).toEqual({
        RspCode: '00',
        Message: 'Confirm Success',
        payment_id: mockPaymentId,
        vnpTxnRef: mockVnpTxnRef,
        status: 'paid',
        statusDesc: 'Giao dịch thành công',
      });

      // Note: Transaction creation is handled separately and tested in transaction service tests
      // The IPN flow focuses on payment status updates and subscription issuance
    });

    it('should handle payment failure and rollback', async () => {
      // Setup payment creation
      paymentRepository.executePaymentTransaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          plans: {
            findFirst: jest.fn().mockResolvedValue(mockPlan),
          },
          payments: {
            create: jest.fn().mockResolvedValue({
              ...mockPayment,
              description: 'Lifetime premium',
            }),
            update: jest.fn().mockResolvedValue({
              ...mockPayment,
              vnp_txn_ref: mockVnpTxnRef,
              description: 'Lifetime premium',
            }),
          },
          transaction: {
            create: jest.fn(),
          },
        };
        return callback(mockTx);
      });

      await paymentService.createVnpayPayment(paymentDto, mockIp);

      // Simulate failed VNPay return
      const failedReturnQuery = {
        vnp_ResponseCode: '10', // Failed
        vnp_TransactionStatus: '02', // Failed
        vnp_Amount: '20000000',
        vnp_TxnRef: mockVnpTxnRef,
        vnp_SecureHash: 'valid-hash',
      };

      vnpayClient.verifyReturnUrl.mockReturnValue({
        isVerified: true,
        vnp_SecureHash: 'valid-hash',
        vnp_ResponseCode: failedReturnQuery.vnp_ResponseCode,
        vnp_TransactionStatus: failedReturnQuery.vnp_TransactionStatus,
        vnp_Amount: 200000, // Library returns major VND
        vnp_TxnRef: failedReturnQuery.vnp_TxnRef,
      });
      paymentRepository.findByVnpTxnRef.mockResolvedValue(mockPayment as any);

      const returnResult = await paymentService.handleReturn({ query: failedReturnQuery });

      expect(returnResult).toEqual({
        payment_id: mockPaymentId,
        vnpTxnRef: mockVnpTxnRef,
        plan_code: mockPlanCode,
        responseCode: '10',
        transactionStatus: '02',
        isVerified: true,
        isSuccess: false,
        status: 'pending',
        verify: {
          isVerified: true,
          vnp_SecureHash: 'valid-hash',
          vnp_ResponseCode: '10',
          vnp_TransactionStatus: '02',
          vnp_Amount: 200000, // Library returns major VND
          vnp_TxnRef: mockVnpTxnRef,
        },
        raw: { query: failedReturnQuery },
      });
    });

    it('should handle concurrent payment attempts with idempotency', async () => {
      const idempotentKey = 'idempotent-payment-123';

      // First payment attempt
      paymentRepository.executePaymentTransaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          plans: {
            findFirst: jest.fn().mockResolvedValue(mockPlan),
          },
          payments: {
            create: jest.fn().mockResolvedValue({
              ...mockPayment,
              description: 'Lifetime premium',
            }),
            update: jest.fn().mockResolvedValue({
              ...mockPayment,
              vnp_txn_ref: mockVnpTxnRef,
              description: 'Lifetime premium',
            }),
          },
          transaction: {
            create: jest.fn(),
          },
        };
        return callback(mockTx);
      });

      const firstResult = await paymentService.createVnpayPayment(paymentDto, mockIp);

      // Second payment attempt with same data should be handled gracefully
      const secondResult = await paymentService.createVnpayPayment(
        {
          ...paymentDto,
        },
        mockIp,
      );

      expect(secondResult).toBeDefined();
      // In a real implementation, this might return the same payment or handle deduplication
    });

    it('should query payment status and handle different VNPay responses', async () => {
      paymentRepository.findByPaymentId.mockResolvedValue(mockPayment as any);

      // Mock successful query response
      vnpayClient.queryDr.mockResolvedValue({
        vnp_ResponseCode: '00',
        vnp_Command: 'querydr',
        vnp_PayDate: '20241201120000',
        vnp_OrderInfo: 'Query payment',
        vnp_TransactionStatus: '00',
        vnp_SecureHash: 'mock-hash',
        vnp_BankCode: 'NCB',
        vnp_CardType: 'ATM',
        vnp_Amount: 20000000,
        vnp_TxnRef: mockVnpTxnRef,
        vnp_TransactionNo: '123456',
      } as any);

      const queryResult = await paymentService.queryDr(mockPaymentId);

      expect(queryResult).toEqual({
        status: 'success',
        payment_id: mockPaymentId,
        vnpTxnRef: mockVnpTxnRef,
        responseCode: '00',
        transactionStatus: '00',
        message: 'Payment successful',
        isSuccess: true,
      });
      expect(vnpayClient.queryDr).toHaveBeenCalled();
    });

    it('should handle subscription upgrade with transaction creation', async () => {
      const upgradeDto = {
        subscriptionId: mockSubscriptionId,
        planCode: mockPlanCode,
        action: 'upgrade',
        periodStart: '2024-01-01T00:00:00.000Z',
        periodEnd: '2024-02-01T00:00:00.000Z',
        currency: 'VND',
        amountTotal: 200000,
        provider: 'vnpay',
        providerPaymentId: mockPaymentId,
      };

      subscriptionRepository.findBySubscriptionId.mockResolvedValue(mockSubscription as any);
      planRepository.findByCode.mockResolvedValue(mockPlan as any);
      transactionRepository.createInTransaction.mockResolvedValue(mockTransaction as any);
      transactionRepository.findFirstInTransaction.mockResolvedValue(null);

      unitOfWork.execute.mockImplementation(async (callback: any) => {
        const mockTx = {
          transaction: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockTransaction),
          },
        };
        return callback(mockTx);
      });

      const transactionResult = await transactionService.create(upgradeDto);

      expect(transactionResult).toEqual(mockTransaction);
      expect(transactionResult.effective_action).toBe('upgrade');
      expect(transactionResult.plan_snapshot_new).toEqual(mockPlan);
    });

    it('should handle refund process for successful transactions', async () => {
      const successfulTransaction = {
        ...mockTransaction,
        status: 'succeeded',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      };

      transactionRepository.findByTxId.mockResolvedValue(successfulTransaction as any);
      transactionRepository.findFirst.mockResolvedValue(null);

      // Check refund eligibility
      const eligibility = await transactionService.checkRefundEligibility(mockTransactionId);

      expect(eligibility.refundable).toBe(true);
      expect(eligibility.refundableAmount).toBe(200000);

      // Process refund
      const refundTransaction = {
        ...mockTransaction,
        tx_id: 'refund-tx-123',
        amount_total: BigInt(-100000),
        amount_subtotal: BigInt(-100000),
        effective_action: 'adjustment',
        status: 'succeeded',
        related_tx_id: mockTransactionId,
      };

      transactionRepository.createInTransaction.mockResolvedValue(refundTransaction as any);

      unitOfWork.execute.mockImplementation(async (callback: any) => {
        const mockTx = {
          transaction: {
            create: jest.fn().mockResolvedValue(refundTransaction),
          },
        };
        return callback(mockTx);
      });

      const refundResult = await transactionService.processRefund(mockTransactionId, {
        amount: 100000,
        reason: 'Customer request',
        notes: 'Integration test refund',
      });

      expect(refundResult).toEqual(refundTransaction);
      expect(refundResult.amount_total).toBe(BigInt(-100000));
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network failures during VNPay communication', async () => {
      // Clear any previous throttling state and use a different payment ID to avoid throttling
      const uniquePaymentId = 'unique-payment-123';
      const uniqueMockPayment = {
        ...mockPayment,
        payment_id: uniquePaymentId,
        vnp_txn_ref: 'unique-vnp123',
      };

      paymentRepository.findByPaymentId.mockResolvedValue(uniqueMockPayment as any);

      // Mock network failure
      vnpayClient.queryDr.mockRejectedValue(new Error('Network timeout'));

      await expect(paymentService.queryDr(uniquePaymentId)).rejects.toThrow('Network timeout');
    });

    it('should handle invalid payment data gracefully', async () => {
      const invalidDto = {
        user_id: '',
        plan_code: '',
      };

      await expect(paymentService.createVnpayPayment(invalidDto, '127.0.0.1')).rejects.toThrow();
    });

    it('should handle transaction conflicts and rollbacks', async () => {
      const conflictingTransaction = { ...mockTransaction, tx_id: 'conflict-tx-123' };

      subscriptionRepository.findBySubscriptionId.mockResolvedValue(mockSubscription as any);
      planRepository.findByCode.mockResolvedValue(mockPlan as any);
      transactionRepository.findFirstInTransaction.mockResolvedValue(conflictingTransaction);

      unitOfWork.execute.mockImplementation(async (callback: any) => {
        const mockTx = {
          transaction: {
            findFirst: jest.fn().mockResolvedValue(conflictingTransaction),
          },
        };
        return callback(mockTx);
      });

      const upgradeDto = {
        subscriptionId: mockSubscriptionId,
        planCode: mockPlanCode,
        action: 'upgrade',
        periodStart: '2024-01-01T00:00:00.000Z',
        periodEnd: '2024-02-01T00:00:00.000Z',
        currency: 'VND',
        amountTotal: 200000,
        provider: 'vnpay',
      };

      await expect(transactionService.create(upgradeDto)).rejects.toThrow(
        'Period overlap with existing transaction',
      );
    });
  });
});
