import moment from 'moment-timezone';

export type BillingPeriod = 'monthly' | 'semiannual' | 'yearly';

export interface PeriodRange {
  start: Date;
  end: Date;
}

/**
 * BillingCycleService
 * - timezone-aware (uses moment-timezone)
 * - anchorDay: 1..28 recommended; if anchorDay > lastDayOfMonth it will be clamped
 */
export class BillingCycleService {
  static DEFAULT_TZ = 'Asia/Ho_Chi_Minh';

  /**
   * Compute next billing period boundaries given a start date.
   * start: inclusive start
   * end: exclusive end (i.e. next cycle begins at end)
   */
  static computeNextPeriod(
    start: Date | string,
    period: BillingPeriod,
    anchorDay?: number,
    tz: string = BillingCycleService.DEFAULT_TZ,
  ): PeriodRange {
    const m = moment.tz(start, tz);

    const months = period === 'monthly' ? 1 : period === 'semiannual' ? 6 : 12;

    // Basic end = start + months
    let end = m.clone().add(months, 'months');

    if (anchorDay && anchorDay >= 1 && anchorDay <= 31) {
      // clamp anchorDay to the end month length
      const lastDay = end.daysInMonth();
      const day = Math.min(anchorDay, lastDay);

      // Preserve the time-of-day from start
      end = end
        .date(day)
        .hour(m.hour())
        .minute(m.minute())
        .second(m.second())
        .millisecond(m.millisecond());

      // If clamping made end <= start (rare), push forward by one period
      if (!end.isAfter(m)) {
        end = end.add(months, 'months');
        const lastDay2 = end.daysInMonth();
        const day2 = Math.min(anchorDay, lastDay2);
        end = end.date(day2);
      }
    }

    return { start: m.toDate(), end: end.toDate() };
  }

  /**
   * rollToNextCycle - given a subscription snapshot (contains current_period_end and billing_period)
   * returns next start/end.
   */
  static rollToNextCycle(
    currentPeriodEnd: Date | string,
    billingPeriod: BillingPeriod,
    anchorDay?: number,
    tz: string = BillingCycleService.DEFAULT_TZ,
  ): PeriodRange {
    // next start is the previous period end
    const start = moment.tz(currentPeriodEnd, tz);
    // computeNextPeriod with start
    return BillingCycleService.computeNextPeriod(start.toDate(), billingPeriod, anchorDay, tz);
  }
}

export default BillingCycleService;
