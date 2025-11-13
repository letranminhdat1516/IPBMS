import {
  getPriceForPeriod,
  calculateProrationGivenPrices,
} from '../src/shared/utils/proration.util';

describe('proration util', () => {
  test('getPriceForPeriod returns monthly price when requested monthly', () => {
    const plan = { price: 150000, billing_period: 'monthly' } as any;
    const priceMonth = getPriceForPeriod(plan, 'monthly');
    expect(priceMonth).toBe(150000);
  });

  test('getPriceForPeriod derives monthly from yearly plan price correctly', () => {
    const plan = { price: 1200000, billing_period: 'yearly' } as any; // 1.2M yearly
    const priceMonth = getPriceForPeriod(plan, 'monthly');
    expect(priceMonth).toBe(Math.round(1200000 / 12));
  });

  test('calculateProrationGivenPrices returns zero when no remaining time', () => {
    const oldPrice = 100000;
    const newPrice = 200000;
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // set now to periodEnd to simulate zero remaining
    const res = calculateProrationGivenPrices(
      oldPrice,
      newPrice,
      periodStart,
      periodEnd,
      periodEnd,
    );
    expect(res.amountDue).toBe(0);
  });

  test('calculateProrationGivenPrices full remaining period returns full delta', () => {
    const oldPrice = 100000;
    const newPrice = 200000;
    const periodStart = new Date('2025-01-01T00:00:00.000Z');
    const periodEnd = new Date('2025-02-01T00:00:00.000Z');
    // now at periodStart -> remaining == total -> factor=1
    const res = calculateProrationGivenPrices(
      oldPrice,
      newPrice,
      periodStart,
      periodEnd,
      periodStart,
    );
    expect(res.amountDue).toBe(newPrice - oldPrice);
  });
});
