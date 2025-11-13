import BillingCycleService from '../src/application/services/subscription/billing-cycle.service';
import moment from 'moment-timezone';

describe('BillingCycleService', () => {
  const tz = 'Asia/Ho_Chi_Minh';

  test('monthly period from start date (no anchor)', () => {
    const start = new Date('2025-01-15T10:00:00+07:00');
    const { start: s, end } = BillingCycleService.computeNextPeriod(
      start,
      'monthly',
      undefined,
      tz,
    );
    expect(s.toISOString()).toBe(new Date('2025-01-15T10:00:00+07:00').toISOString());
    const expectedEnd = moment.tz(start, tz).add(1, 'months').toDate();
    expect(end.toISOString()).toBe(expectedEnd.toISOString());
  });

  test('monthly with anchor day 1 (Jan 31 -> Feb 28)', () => {
    const start = new Date('2025-01-31T09:00:00+07:00');
    const { end } = BillingCycleService.computeNextPeriod(start, 'monthly', 31, tz);
    // Feb 2025 (not leap year) last day is 28
    const expected = moment.tz(start, tz).add(1, 'months').date(28).hour(9).toDate();
    expect(end.toISOString()).toBe(expected.toISOString());
  });

  test('semiannual rollToNextCycle retains timezone and anchor', () => {
    const currentPeriodEnd = '2025-03-10T00:00:00+07:00';
    const next = BillingCycleService.rollToNextCycle(currentPeriodEnd, 'semiannual', 10, tz);
    const expectedStart = moment.tz(currentPeriodEnd, tz).toDate();
    const expectedEnd = moment.tz(currentPeriodEnd, tz).add(6, 'months').date(10).toDate();
    expect(next.start.toISOString()).toBe(expectedStart.toISOString());
    expect(next.end.toISOString()).toBe(expectedEnd.toISOString());
  });

  test('yearly with anchor 29 on leap-year handling', () => {
    const start = new Date('2023-02-28T08:00:00+07:00');
    // adding yearly with anchor 29 should clamp Feb 2024 to 29 (2024 is leap)
    const { end } = BillingCycleService.computeNextPeriod(start, 'yearly', 29, tz);
    const expected = moment.tz(start, tz).add(1, 'years');
    const lastDay = expected.daysInMonth();
    const day = Math.min(29, lastDay);
    expected.date(day).hour(8);
    expect(end.toISOString()).toBe(expected.toDate().toISOString());
  });
});
