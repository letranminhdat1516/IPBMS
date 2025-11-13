import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_TZ = 'Asia/Ho_Chi_Minh';

export type BillingPeriod = 'monthly' | 'yearly' | `custom-${number}-days` | 'none';

export function addBillingPeriod(start: Date, period: BillingPeriod, tz = DEFAULT_TZ): Date {
  const d = dayjs(start).tz(tz);
  if (period === 'monthly') return d.add(1, 'month').toDate();
  if (period === 'yearly') return d.add(1, 'year').toDate();
  if (period.startsWith('custom-')) {
    const m = period.match(/custom-(\d+)-days/);
    if (m) return d.add(Number(m[1]), 'day').toDate();
  }
  return d.toDate();
}

export function nextPeriodRange(
  start: Date,
  period: BillingPeriod,
  tz = DEFAULT_TZ,
): { start: Date; end: Date } {
  const s = dayjs(start).tz(tz);
  const e = dayjs(addBillingPeriod(s.toDate(), period, tz))
    .tz(tz)
    .subtract(1, 'second');
  return { start: s.toDate(), end: e.toDate() };
}
