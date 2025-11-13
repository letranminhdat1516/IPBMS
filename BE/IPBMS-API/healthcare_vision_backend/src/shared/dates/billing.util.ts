import dayjs from 'dayjs';
import tz from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(tz);

export type BillingPeriod = 'monthly' | 'yearly' | 'semiannual' | 'none';
export const VN_TZ = 'Asia/Ho_Chi_Minh';

export function addBillingPeriod(start: Date, period: BillingPeriod): Date {
  const d = dayjs(start).tz(VN_TZ);
  switch (period) {
    case 'yearly':
      return d.add(1, 'year').toDate();
    case 'semiannual':
      return d.add(6, 'month').toDate();
    case 'monthly':
      return d.add(1, 'month').toDate();
    case 'none':
    default:
      return d.toDate();
  }
}
