import { SubscriptionService } from '@/application/services';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { VNPay, VnpLocale } from 'vnpay';
import { CreatePaymentDto } from '../src/application/dto/payment/payment.dto';
import { AlertsService } from '../src/application/services/alerts.service';
import { CacheService } from '../src/application/services/cache.service';
import { NotificationsService } from '../src/application/services/notifications.service';
import { PaymentEventService } from '../src/application/services/payment-event.service';
import { PaymentService } from '../src/application/services/payment.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { PaymentRepository } from '../src/infrastructure/repositories/payments/payment.repository';
import { VNPAY_CLIENT } from '../src/shared/providers/vnpay.provider';

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: jest.Mocked<PaymentRepository>;
  let vnpayClient: jest.Mocked<VNPay>;
  let configService: jest.Mocked<ConfigService>;
  let cacheService: jest.Mocked<CacheService>;
  let prismaService: jest.Mocked<PrismaService>;
  let alertsService: jest.Mocked<AlertsService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let subscriptionService: jest.Mocked<SubscriptionService>;
  let paymentEventService: jest.Mocked<PaymentEventService>;

  const mockUserId = 'test-user-id';
  const mockPlanCode = 'premium';
  const mockPaymentId = 'payment-123';
  const mockVnpTxnRef = 'payment123';
  const mockIp = '127.0.0.1';

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

    const mockAlertsService = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
    };

    const mockNotificationsService = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
    };

    const mockSubscriptionService = {
      createSubscriptionFromPayment: jest.fn(),
      handlePaymentSuccess: jest.fn(),
      getActive: jest.fn(),
      createEntitlementsForSubscription: jest.fn(),
    };

    const mockPaymentEventService = {
      handlePaymentSuccess: jest.fn(),
      handlePaymentFailed: jest.fn(),
      handlePaymentRetry: jest.fn(),
    };

    const mockPrismaService: jest.Mocked<PrismaService> = {
      subscriptions: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      payments: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn(async (callback) => {
        return callback(mockPrismaService);
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PaymentRepository,
          useValue: mockPaymentRepository,
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
          provide: AlertsService,
          useValue: mockAlertsService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: SubscriptionService,
          useValue: mockSubscriptionService,
        },
        {
          provide: PaymentEventService,
          useValue: mockPaymentEventService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paymentRepository = module.get(PaymentRepository);
    vnpayClient = module.get(VNPAY_CLIENT);
    configService = module.get(ConfigService);
    cacheService = module.get(CacheService);
    prismaService = module.get(PrismaService);
    alertsService = module.get(AlertsService);
    notificationsService = module.get(NotificationsService);
    subscriptionService = module.get(SubscriptionService);
    paymentEventService = module.get(PaymentEventService);

    // Setup default mocks
    subscriptionService.handlePaymentSuccess.mockResolvedValue({
      success: true,
      reason: undefined,
    });
    subscriptionService.getActive.mockResolvedValue({
      subscription_id: 'sub-123',
      user_id: mockUserId,
      // plan_code moved to plan snapshot/plan object; tests should reference plan via plan_id or plan mock
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

  describe('subscription expiration cron', () => {
    it.todo('marks expired subscriptions, schedules downgrade, and emits notifications');
    it.todo('does not create downgrade when already on basic plan');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createVnpayPayment', () => {
    const validDto: CreatePaymentDto = {
      user_id: mockUserId,
      plan_code: mockPlanCode,
      description: 'Test payment',
    };

    const mockPlan = {
      id: 'plan-1',
      code: mockPlanCode,
      price: BigInt(200000),
      name: 'Premium Plan',
      status: 'active',
      created_at: new Date(),
      version: '1.0',
      camera_quota: 10,
      caregiver_seats: 5,
      sites: 3,
      retention_days: 90,
      is_current: true,
      effective_from: new Date(),
      effective_to: null,
      major_updates_months: 12,
      storage_size: 100,
      is_recommended: true,
      tier: 'premium',
      currency: 'VND',
    };

    const mockPayment = {
      payment_id: mockPaymentId,
      amount: BigInt(200000),
      description: 'Test payment',
      status: 'pending',
      user_id: mockUserId,
      plan_id: 'plan-1',
      vnp_txn_ref: mockVnpTxnRef,
      created_at: new Date(),
      updated_at: new Date(),
      // plan_code removed from payments model; use plan_id to reference plan
      vnp_create_date: null,
      vnp_expire_date: null,
      vnp_order_info: null,
      version: null,
      currency: 'VND',
      provider: 'vn_pay',
      delivery_data: {},
    };

    beforeEach(() => {
      configService.getOrThrow.mockImplementation((key: string) => {
        if (key === 'VNP_RETURN_URL') return 'https://example.com/return';
        if (key === 'VNP_HASH_SECRET') return 'TESTSECRET';
        if (key === 'VNP_TMN_CODE') return 'TESTCODE';
        throw new Error(`Unexpected config key: ${key}`);
      });
      configService.get.mockImplementation((key: string) => {
        if (key === 'VNP_LOCALE') return VnpLocale.VN;
        if (key === 'VNP_VERSION') return '2.1.0';
        if (key === 'VNP_COMMAND') return 'pay';
        if (key === 'VNP_CURR_CODE') return 'VND';
        if (key === 'VNP_ORDER_TYPE') return 'other';
        // Return undefined for other keys to use defaults
        return undefined;
      });
      vnpayClient.buildPaymentUrl.mockReturnValue('https://vnpay.vn/payment-url');
    });

    it('should throw BadRequestException when user_id is missing', async () => {
      const dto = { ...validDto, user_id: '' };

      await expect(service.createVnpayPayment(dto, mockIp)).rejects.toThrow(BadRequestException);
      expect(paymentRepository.findPlanByCode).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when plan_code is missing', async () => {
      const dto = { ...validDto, plan_code: '' };

      await expect(service.createVnpayPayment(dto, mockIp)).rejects.toThrow(BadRequestException);
      expect(paymentRepository.findPlanByCode).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when plan is not found', async () => {
      paymentRepository.findPlanByCode.mockResolvedValue(null);

      await expect(service.createVnpayPayment(validDto, mockIp)).rejects.toThrow(
        BadRequestException,
      );
      expect(paymentRepository.findPlanByCode).toHaveBeenCalledWith(mockPlanCode.toLowerCase());
    });

    it('should successfully create VNPay payment URL', async () => {
      paymentRepository.findPlanByCode.mockResolvedValue(mockPlan as any);
      paymentRepository.findByVnpTxnRef.mockResolvedValue(null);
      paymentRepository.findActiveSubscriptionByUserIdInTransaction.mockResolvedValue(null);
      paymentRepository.updateInTransaction.mockResolvedValue({
        ...mockPayment,
        vnp_txn_ref: mockVnpTxnRef,
      } as any);

      paymentRepository.executePaymentTransaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          plans: {
            findFirst: jest.fn().mockResolvedValue(mockPlan),
          },
          payments: {
            create: jest.fn().mockResolvedValue(mockPayment as any),
            update: jest.fn().mockResolvedValue({
              ...mockPayment,
              vnp_txn_ref: mockVnpTxnRef,
            } as any),
          },
          transaction: {
            create: jest.fn(),
          },
        };

        return callback(mockTx);
      });

      const result = await service.createVnpayPayment(validDto, mockIp);

      expect(result).toEqual({
        paymentId: mockPaymentId,
        plan_code: mockPlanCode,
        vnp_Amount: BigInt(200000),
        paymentUrl: expect.stringContaining('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
      });
      expect(result.paymentUrl).toContain('vnp_Amount=20000000');
      expect(result.paymentUrl).toContain('vnp_TmnCode=TESTCODE');
      expect(result.paymentUrl).toContain('vnp_SecureHash='); // lowercase hash
      expect(paymentRepository.executePaymentTransaction).toHaveBeenCalled();
      // Note: vnpayClient.buildPaymentUrl is no longer used since we build the URL ourselves
    });
  });

  describe('queryDr', () => {
    const mockPayment = {
      payment_id: mockPaymentId,
      vnp_txn_ref: mockVnpTxnRef,
      vnp_create_date: BigInt('20231201120000'),
      amount: BigInt(200000),
      user_id: mockUserId,
      description: 'Test payment',
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
      plan_id: 'plan-1',
      vnp_expire_date: null,
      vnp_order_info: null,
      version: null,
    };

    beforeEach(() => {
      vnpayClient.queryDr.mockResolvedValue({
        vnp_ResponseCode: '00',
        vnp_Command: 'querydr',
        vnp_PayDate: '20231201120000',
        vnp_OrderInfo: 'Query payment123',
        vnp_TransactionStatus: '00',
        vnp_SecureHash: 'mock-hash',
        vnp_BankCode: 'NCB',
        vnp_CardType: 'ATM',
        vnp_Amount: 20000000,
        vnp_TxnRef: mockVnpTxnRef,
        vnp_TransactionNo: '123456',
      } as any);
    });

    it('should throw NotFoundException when payment not found', async () => {
      paymentRepository.findByPaymentId.mockResolvedValue(null);
      paymentRepository.findByVnpTxnRef.mockResolvedValue(null);

      await expect(service.queryDr(mockPaymentId)).rejects.toThrow(NotFoundException);
    });

    it('should successfully query VNPay payment status', async () => {
      const mockPlan = {
        id: 'plan-1',
        code: 'premium',
        price: BigInt(200000),
        name: 'Premium Plan',
        status: 'active',
        created_at: new Date(),
        version: '1.0',
        camera_quota: 10,
        caregiver_seats: 5,
        sites: 3,
        retention_days: 90,
        is_current: true,
        effective_from: new Date(),
        effective_to: null,
        major_updates_months: 12,
        storage_size: 100,
        is_recommended: true,
        tier: 'premium',
        currency: 'VND',
      };

      // Mock findByPaymentId to return payment for any payment ID that contains the base ID
      paymentRepository.findByPaymentId.mockImplementation((paymentId: string) => {
        if (paymentId.includes(mockPaymentId)) {
          return Promise.resolve(mockPayment as any);
        }
        return Promise.resolve(null);
      });

      paymentRepository.findPlanByCode.mockResolvedValue(mockPlan as any);
      paymentRepository.updatePaymentStatus.mockResolvedValue(mockPayment as any);
      (prismaService.subscriptions.create as jest.MockedFunction<any>).mockResolvedValue({
        subscription_id: 'sub-123',
        user_id: mockUserId,
        plan_code: 'premium',
        status: 'active',
        billing_period: 'monthly',
        started_at: new Date(),
        current_period_start: new Date(),
        current_period_end: new Date(),
        auto_renew: true,
        last_payment_at: new Date(),
      } as any);

      // Use a unique payment ID to avoid throttling
      const uniquePaymentId = `${mockPaymentId}-unique-${Date.now()}`;

      const result = await service.queryDr(uniquePaymentId);

      expect(result).toEqual({
        status: 'success',
        payment_id: mockPaymentId,
        vnpTxnRef: mockVnpTxnRef,
        responseCode: '00',
        transactionStatus: '00',
        message: 'Payment successful',
        isSuccess: true,
      });
      expect(vnpayClient.queryDr).toHaveBeenCalledWith({
        vnp_RequestId: expect.any(String),
        vnp_IpAddr: mockIp,
        vnp_TxnRef: mockVnpTxnRef,
        vnp_OrderInfo: `Query ${uniquePaymentId}`,
        vnp_CreateDate: 20231201120000,
        vnp_TransactionDate: 20231201120000,
        vnp_TransactionNo: 0,
      });
    });
  });

  describe('handleReturn', () => {
    const mockQuery = {
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_Amount: '20000000',
      vnp_TxnRef: mockVnpTxnRef,
      vnp_SecureHash: 'mock-hash',
    };

    const mockPayment = {
      payment_id: mockPaymentId,
      amount: BigInt(200000),
      // plan_code now stored in delivery_data
      delivery_data: { plan_code: mockPlanCode },
      status: 'pending',
      vnp_txn_ref: mockVnpTxnRef,
      user_id: mockUserId,
      description: 'Test payment',
      created_at: new Date(),
      updated_at: new Date(),
      plan_id: 'plan-1',
      vnp_create_date: null,
      vnp_expire_date: null,
      vnp_order_info: null,
      version: null,
    };

    beforeEach(() => {
      vnpayClient.verifyReturnUrl.mockReturnValue({
        isVerified: true,
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_Amount: 200000, // Library returns major VND, not minor
        vnp_TxnRef: mockVnpTxnRef,
      } as any);
    });

    it('should throw BadRequestException for invalid signature', async () => {
      vnpayClient.verifyReturnUrl.mockReturnValue({
        isVerified: false,
      } as any);

      await expect(service.handleReturn(mockQuery)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when payment not found', async () => {
      paymentRepository.findByVnpTxnRef.mockResolvedValue(null);

      await expect(service.handleReturn(mockQuery)).rejects.toThrow(NotFoundException);
    });

    it('should successfully handle successful payment return', async () => {
      paymentRepository.findByVnpTxnRef.mockResolvedValue(mockPayment as any);

      const result = await service.handleReturn(mockQuery);

      expect(result).toEqual({
        payment_id: mockPaymentId,
        vnpTxnRef: mockVnpTxnRef,
        plan_code: mockPlanCode,
        responseCode: '00',
        transactionStatus: '00',
        isVerified: true,
        isSuccess: true,
        status: 'pending',
        verify: expect.any(Object),
        raw: mockQuery,
      });
    });
  });

  describe('handleIpn', () => {
    const mockQuery = {
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_Amount: '20000000',
      vnp_TxnRef: mockVnpTxnRef,
      vnp_SecureHash: 'mock-hash',
    };

    const mockPayment = {
      payment_id: mockPaymentId,
      amount: BigInt(200000),
      // plan_code moved into delivery_data
      delivery_data: { plan_code: mockPlanCode },
      status: 'pending',
      vnp_txn_ref: mockVnpTxnRef,
      user_id: mockUserId,
      description: 'Test payment',
      created_at: new Date(),
      updated_at: new Date(),
      plan_id: 'plan-1',
      vnp_create_date: null,
      vnp_expire_date: null,
      vnp_order_info: null,
      version: null,
    };

    beforeEach(() => {
      vnpayClient.verifyIpnCall.mockReturnValue({
        isVerified: true,
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_Amount: 20000000,
        vnp_TxnRef: mockVnpTxnRef,
      } as any);
    });

    it('should return error for invalid signature', async () => {
      vnpayClient.verifyIpnCall.mockReturnValue({
        isVerified: false,
      } as any);

      const result = await service.handleIpn(mockQuery);

      expect(result).toEqual({
        RspCode: '97',
        Message: 'Invalid signature',
      });
    });

    it('should return error when payment not found', async () => {
      paymentRepository.findByVnpTxnRef.mockResolvedValue(null);

      const result = await service.handleIpn(mockQuery);

      expect(result).toEqual({
        RspCode: '01',
        Message: 'Order not found',
      });
    });

    it('should successfully handle successful payment IPN', async () => {
      const mockPayment = {
        payment_id: mockPaymentId,
        amount: BigInt(200000),
        status: 'paid',
        created_at: new Date(),
        user_id: mockUserId,
        description: 'Test payment',
        updated_at: new Date(),
        plan_id: 'plan-1',
        vnp_txn_ref: null,
        vnp_create_date: null,
        vnp_expire_date: null,
        vnp_order_info: null,
        version: null,
      };

      paymentRepository.findByVnpTxnRef.mockResolvedValue(mockPayment as any);
      paymentRepository.updatePaymentStatus.mockResolvedValue(mockPayment as any);
      const mockPlan = {
        id: 'plan-1',
        code: 'premium',
        price: BigInt(200000),
        name: 'Premium Plan',
        status: 'active',
        created_at: new Date(),
        version: '1.0',
        camera_quota: 10,
        caregiver_seats: 5,
        sites: 3,
        retention_days: 90,
        is_current: true,
        effective_from: new Date(),
        effective_to: null,
        major_updates_months: 12,
        storage_size: 100,
        is_recommended: true,
        tier: 'premium',
        currency: 'VND',
      };
      paymentRepository.findPlanByCode.mockResolvedValue(mockPlan as any);
      (prismaService.subscriptions.create as jest.MockedFunction<any>).mockResolvedValue({
        subscription_id: 'sub-123',
        user_id: mockUserId,
        plan_code: 'premium',
        status: 'active',
        billing_period: 'monthly',
        started_at: new Date(),
        current_period_start: new Date(),
        current_period_end: new Date(),
        auto_renew: true,
        last_payment_at: new Date(),
      } as any);

      const result = await service.handleIpn(mockQuery);

      expect(result).toEqual({
        RspCode: '00',
        Message: 'Confirm Success',
        status: 'paid',
        statusDesc: 'Giao dịch thành công',
        payment_id: mockPaymentId,
        vnpTxnRef: mockVnpTxnRef,
      });
      expect(prismaService.payments.updateMany).toHaveBeenCalledWith({
        where: { payment_id: mockPaymentId, status: { not: 'paid' } },
        data: { status: 'paid', status_enum: 'completed' },
      });
    });
  });

  describe('listPayments', () => {
    const mockPayments = [
      {
        payment_id: 'payment-1',
        amount: BigInt(100000),
        status: 'paid',
        plan_code: 'basic',
        created_at: new Date(),
        user_id: mockUserId,
        description: 'Payment 1',
        updated_at: new Date(),
        plan_id: 'plan-1',
        vnp_txn_ref: null,
        vnp_create_date: null,
        vnp_expire_date: null,
        vnp_order_info: null,
        version: null,
      },
      {
        payment_id: 'payment-2',
        amount: BigInt(200000),
        status: 'pending',
        plan_code: 'premium',
        created_at: new Date(),
        user_id: mockUserId,
        description: 'Payment 2',
        updated_at: new Date(),
        plan_id: 'plan-2',
        vnp_txn_ref: null,
        vnp_create_date: null,
        vnp_expire_date: null,
        vnp_order_info: null,
        version: null,
      },
    ];

    it('should list all payments without filters', async () => {
      paymentRepository.findPayments.mockResolvedValue(mockPayments as any);

      const result = await service.listPayments();

      expect(result).toEqual(mockPayments);
      expect(paymentRepository.findPayments).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should list payments filtered by userId', async () => {
      paymentRepository.findPayments.mockResolvedValue([mockPayments[0]] as any);

      const result = await service.listPayments(mockUserId);

      expect(result).toEqual([mockPayments[0]]);
      expect(paymentRepository.findPayments).toHaveBeenCalledWith(mockUserId, undefined);
    });
  });

  describe('debugCheckTransaction', () => {
    const mockPayment = {
      payment_id: mockPaymentId,
      status: 'paid',
      amount: BigInt(200000),
      delivery_data: { plan_code: mockPlanCode },
      created_at: new Date(),
      user_id: mockUserId,
      description: 'Test payment',
      updated_at: new Date(),
      plan_id: 'plan-1',
      vnp_txn_ref: null,
      vnp_create_date: null,
      vnp_expire_date: null,
      vnp_order_info: null,
      version: null,
    };

    const mockTransaction = {
      tx_id: 'tx-123',
      payment_id: mockPaymentId,
      provider_payment_id: 'prov-123',
      status: 'completed',
      amount_total: BigInt(200000),
      created_at: new Date(),
      subscription_id: 'sub-123',
    };

    it('should return payment and transaction details when both exist', async () => {
      paymentRepository.findByPaymentId.mockResolvedValue(mockPayment as any);
      paymentRepository.findTransactionByPaymentId.mockResolvedValue(mockTransaction as any);

      const result = await service.debugCheckTransaction(mockPaymentId);

      expect(result).toEqual({
        payment: {
          payment_id: mockPaymentId,
          status: 'paid',
          amount: BigInt(200000),
          plan_code: mockPlanCode,
          created_at: mockPayment.created_at,
        },
        transaction: {
          tx_id: 'tx-123',
          provider_payment_id: 'prov-123',
          subscription_id: 'sub-123',
          status: 'completed',
          amount_total: BigInt(200000),
          created_at: mockTransaction.created_at,
        },
      });
    });
  });
});
