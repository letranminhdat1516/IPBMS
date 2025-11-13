import { validate } from 'class-validator';
import { CreatePaymentDto } from '../src/application/dto/payment/payment.dto';
import { UpgradePlanDto, ManualRenewRequestDto } from '../src/application/dto/plans/plan.dto';

describe('Payment/Plan DTO validation', () => {
  test('CreatePaymentDto allows billing_period "none"', async () => {
    const dto = new CreatePaymentDto();
    dto.plan_code = 'basic';
    dto.billing_period = 'none' as any;

    const errors = await validate(dto as any);
    expect(errors.length).toBe(0);
  });

  test('CreatePaymentDto rejects invalid billing_period', async () => {
    const dto = new CreatePaymentDto();
    dto.plan_code = 'basic';
    // invalid value
    (dto as any).billing_period = 'yearly';

    const errors = await validate(dto as any);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('UpgradePlanDto accepts desired_billing_interval none', async () => {
    const dto = new UpgradePlanDto();
    dto.plan_code = 'premium';
    dto.desired_billing_interval = 'none' as any;

    const errors = await validate(dto as any);
    expect(errors.length).toBe(0);
  });

  test('ManualRenewRequestDto accepts billing_period none', async () => {
    const dto = new ManualRenewRequestDto();
    dto.billing_period = 'none' as any;
    const errors = await validate(dto as any);
    expect(errors.length).toBe(0);
  });
});
