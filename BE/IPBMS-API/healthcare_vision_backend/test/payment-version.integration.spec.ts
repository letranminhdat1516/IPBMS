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

describe('Payment Version/DeliveryData enrichment', () => {
  let paymentService: PaymentService;
  let paymentRepository: jest.Mocked<PaymentRepository>;
  let configService: jest.Mocked<ConfigService>;
  let vnpayClient: jest.Mocked<any>;

  const mockUserId = 'user-ver-1';
  const mockPlanCode = 'pro';
  const planVersion = '1.2.3';
  const mockPaymentId = 'payment-ver-1';
  const vnpRef = 'paymentver1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PaymentRepository,
          useValue: {
            findPlanByCode: jest.fn(),
            executePaymentTransaction: jest.fn(),
            findActiveSubscriptionByUserIdInTransaction: jest.fn(),
            findByVnpTxnRef: jest.fn(),
            updateInTransaction: jest.fn(),
            findByPaymentId: jest.fn(),
            updatePaymentStatus: jest.fn(),
            findPayments: jest.fn(),
            findTransactionByPaymentId: jest.fn(),
          },
        },
        { provide: ConfigService, useValue: { getOrThrow: jest.fn(), get: jest.fn() } },
        {
          provide: CacheService,
          useValue: { get: jest.fn(), set: jest.fn(), delete: jest.fn(), clear: jest.fn() },
        },
        { provide: AlertsService, useValue: { create: jest.fn() } },
        { provide: NotificationsService, useValue: { create: jest.fn() } },
        {
          provide: SubscriptionService,
          useValue: { handlePaymentSuccess: jest.fn().mockResolvedValue({ success: true }) },
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
          useValue: { payments: { create: jest.fn() }, plans: { findFirst: jest.fn() } },
        },
        {
          provide: VNPAY_CLIENT,
          useValue: {
            buildPaymentUrl: jest.fn(),
            queryDr: jest.fn(),
            verifyReturnUrl: jest.fn(),
            verifyIpnCall: jest.fn(),
          },
        },
      ],
    }).compile();

    paymentService = module.get(PaymentService);
    paymentRepository = module.get(PaymentRepository) as any;
    configService = module.get(ConfigService) as any;
    vnpayClient = module.get(VNPAY_CLIENT) as any;

    configService.getOrThrow.mockReturnValue('app://return');
    configService.get.mockReturnValue('vn');
    vnpayClient.buildPaymentUrl.mockReturnValue('https://vnpay.vn/url');
  });

  it('should set payments.version and delivery_data.plan_version for VNPay creation', async () => {
    const dto = { user_id: mockUserId, plan_code: mockPlanCode, description: 'desc' } as any;
    const mockPlan = { code: mockPlanCode, price: BigInt(149000), version: planVersion };
    const createdPayment = { payment_id: mockPaymentId, amount: BigInt(149000) } as any;
    // Ensure plan lookup succeeds before entering transaction
    paymentRepository.findPlanByCode.mockResolvedValue(mockPlan as any);

    (paymentRepository.executePaymentTransaction as jest.Mock).mockImplementation(
      async (cb: any) => {
        const tx = {
          plans: { findFirst: jest.fn().mockResolvedValue(mockPlan) },
          payments: {
            create: jest.fn().mockResolvedValue(createdPayment),
            update: jest.fn().mockResolvedValue({ ...createdPayment, vnp_txn_ref: vnpRef }),
          },
          transactions: { create: jest.fn() },
        } as any;
        const res = await cb(tx);
        // Assert that payments.create was called with version + delivery_data.plan_version
        const call = (tx.payments.create as jest.Mock).mock.calls[0]?.[0];
        expect(call.data.version).toBe(planVersion);
        expect(call.data.delivery_data).toMatchObject({
          plan_code: mockPlanCode,
          plan_version: planVersion,
        });
        return res;
      },
    );
    paymentRepository.findByVnpTxnRef.mockResolvedValue(null);
    paymentRepository.updateInTransaction.mockResolvedValue({
      ...createdPayment,
      vnp_txn_ref: vnpRef,
    } as any);
    paymentRepository.findActiveSubscriptionByUserIdInTransaction.mockResolvedValue(null);

    const result = await paymentService.createVnpayPayment(dto, '127.0.0.1');
    expect(result).toMatchObject({ paymentId: mockPaymentId });
  });

  it('should set payments.version and delivery_data.plan_version for manual creation', async () => {
    const prisma = (paymentService as any)._prismaService as PrismaService;
    // @ts-ignore
    prisma.plans.findFirst = jest
      .fn()
      .mockResolvedValue({ code: mockPlanCode, version: planVersion });
    // @ts-ignore
    prisma.payments.create = jest.fn().mockResolvedValue({ payment_id: mockPaymentId });

    const payment = await paymentService.createManualPayment({
      user_id: mockUserId,
      amount: 1000,
      description: 'manual',
      delivery_data: { plan_code: mockPlanCode },
      provider: 'manual',
    });

    expect(payment).toBeDefined();
    const call = (prisma.payments.create as jest.Mock).mock.calls[0]?.[0];
    expect(call.data.version).toBe(planVersion);
    expect(call.data.delivery_data).toMatchObject({
      plan_code: mockPlanCode,
      plan_version: planVersion,
    });
  });
});
