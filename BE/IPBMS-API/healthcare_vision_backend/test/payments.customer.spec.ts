import { SubscriptionService } from '@/application/services';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from '../src/application/services/alerts.service';
import { CacheService } from '../src/application/services/cache.service';
import { NotificationsService } from '../src/application/services/notifications.service';
import { PaymentEventService } from '../src/application/services/payment-event.service';
import { PaymentService } from '../src/application/services/payment.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { PaymentRepository } from '../src/infrastructure/repositories/payments/payment.repository';
import { VNPAY_CLIENT } from '../src/shared/providers/vnpay.provider';

describe('Customer VNPay create flow', () => {
  let paymentService: PaymentService;
  let paymentRepository: jest.Mocked<PaymentRepository>;
  let subscriptionService: jest.Mocked<SubscriptionService>;
  let paymentEventService: jest.Mocked<PaymentEventService>;
  let vnpayClient: any;
  let configService: any;
  let cacheService: jest.Mocked<CacheService>;
  let alertsService: jest.Mocked<AlertsService>;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockUserId = 'cust-test-1';
  const mockPaymentId = 'pay-test-1';
  const mockPlan = {
    code: 'basic',
    name: 'Basic Plan',
    price: 0,
    currency: 'VND',
    is_current: true,
    id: 'plan-basic-1',
    created_at: new Date(),
  } as any;

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
    } as any;

    const mockVnpayClient = {
      buildPaymentUrl: jest.fn(),
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
      },
      $transaction: jest.fn(async (callback) => {
        return callback(mockPrismaService);
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PaymentRepository, useValue: mockPaymentRepository },
        { provide: VNPAY_CLIENT, useValue: mockVnpayClient },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CacheService, useValue: mockCacheService },
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
          useValue: {
            createSubscriptionFromPayment: jest.fn(),
            handlePaymentSuccess: jest.fn(),
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
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    paymentService = module.get(PaymentService);
    paymentRepository = module.get(PaymentRepository);
    subscriptionService = module.get(SubscriptionService);
    paymentEventService = module.get(PaymentEventService);
    vnpayClient = module.get(VNPAY_CLIENT);
    configService = module.get(ConfigService);
    cacheService = module.get(CacheService);
    alertsService = module.get(AlertsService);
    notificationsService = module.get(NotificationsService);

    // default mocks
    configService.getOrThrow.mockReturnValue('https://example.com/return');
    configService.get.mockReturnValue('vn');
    vnpayClient.buildPaymentUrl.mockReturnValue('https://sandbox.vnpayment.vn/payment-url');
    paymentRepository.findPlanByCode.mockResolvedValue(mockPlan);
    // Ensure updateInTransaction returns updated payment with description
    paymentRepository.updateInTransaction.mockResolvedValue({
      payment_id: mockPaymentId,
      vnp_txn_ref: 'txnref123',
      user_id: mockUserId,
      amount: BigInt(mockPlan.price),
      currency: 'VND',
      provider: 'vn_pay',
      description: 'Test payment',
      status: 'pending',
      // status_enum is optional in Prisma and may be null; cast to any to avoid strict typing in mocked return
      status_enum: null as any,
      delivery_data: null,
      created_at: new Date(),
      updated_at: new Date(),
      vnp_create_date: null,
      vnp_expire_date: null,
      vnp_order_info: null,
      version: null,
    } as any);

    // simulate transaction flow where user has no active subscription
    paymentRepository.executePaymentTransaction.mockImplementation(async (callback: any) => {
      const mockTx = {
        plans: { findFirst: jest.fn().mockResolvedValue(mockPlan) },
        payments: {
          create: jest.fn().mockResolvedValue({
            payment_id: mockPaymentId,
            amount: BigInt(mockPlan.price),
            currency: 'VND',
            provider: 'vn_pay',
            description: 'Test payment',
            status: 'pending',
            delivery_data: null,
            user_id: mockUserId,
            vnp_txn_ref: null,
            created_at: new Date(),
          }),
          update: jest.fn().mockResolvedValue({
            payment_id: mockPaymentId,
            vnp_txn_ref: 'txnref123',
            amount: BigInt(mockPlan.price),
            currency: 'VND',
            provider: 'vn_pay',
            description: 'Test payment',
          }),
        },
        transaction: { create: jest.fn() },
      };
      return callback(mockTx);
    });
  });

  it('returns paymentUrl and paymentId for customer', async () => {
    const dto = { user_id: mockUserId, plan_code: 'basic' } as any;
    const res = await paymentService.createVnpayPayment(dto, '127.0.0.1');
    expect(res).toBeDefined();
    expect(res.paymentId).toBe(mockPaymentId);
    expect(res.paymentUrl).toContain('sandbox.vnpayment.vn');
  });
});
