/**
 * Proration utilities — operate in minor units (bigint) only.
 */
export function prorateMinor(
  oldMinor: bigint,
  newMinor: bigint,
  remainingMs: bigint,
  totalMs: bigint,
): bigint {
  if (totalMs === 0n) return 0n;
  const delta = newMinor - oldMinor;
  const raw = (delta * remainingMs) / totalMs;
  return raw < 0n ? 0n : raw;
}

import { roundMajor, toMinor } from './money.util';

export function toMinorFromNumber(amount: number): bigint {
  // delegate to central money util to ensure consistent behavior
  // `toMinor` expects major number and returns bigint minor (×100)
  return toMinor(amount);
}

export type BillingPeriod = 'monthly' | 'none';

/**
 * Normalize a plan's single price field to the requested billing period.
 * Assumes plan.price is expressed in its own plan.billing_period if present,
 * otherwise treated as monthly by default.
 */
export function getPriceForPeriod(plan: any, billingPeriod: string | BillingPeriod): number {
  const base = Number(plan?.price ?? 0);
  const planPeriod = String(plan?.billing_period || '').toLowerCase();

  const normalizePeriod = (period: string | BillingPeriod | undefined): number => {
    if (!period) return 1;
    const p = String(period).toLowerCase();
    if (p === 'yearly') return 12;
    if (p === 'semiannual' || p === 'semiannually' || p === 'semi-annually') return 6;
    // default: treat as monthly
    return 1;
  };

  const baseMonths = normalizePeriod(planPeriod as BillingPeriod);
  const targetMonths = normalizePeriod(billingPeriod === 'none' ? 'monthly' : billingPeriod);

  if (baseMonths <= 0) {
    return roundMajor(base);
  }

  const monthlyPrice = base / baseMonths;
  return roundMajor(monthlyPrice * targetMonths);
}

/**
 * Calculate proration charge given two prices (major VND) and period anchors.
 * Returns amounts in major VND.
 */
export function calculateProrationGivenPrices(
  oldPrice: number,
  newPrice: number,
  periodStart: Date,
  periodEnd: Date,
  now = new Date(),
): { prorationCharge: number; prorationCredit: number; amountDue: number } {
  if (!periodStart || !periodEnd) throw new Error('Invalid subscription period');

  const totalPeriodMs = periodEnd.getTime() - periodStart.getTime();
  if (totalPeriodMs <= 0) throw new Error('Invalid subscription period length');

  const remainingMs = Math.max(0, periodEnd.getTime() - now.getTime());
  const prorationFactor = Math.max(0, Math.min(1, remainingMs / totalPeriodMs));

  const priceDelta = newPrice - oldPrice;
  const amountDueRaw = Math.max(priceDelta * prorationFactor, 0);
  const amountDue = roundMajor(amountDueRaw);

  return { prorationCharge: amountDue, prorationCredit: 0, amountDue };
}

/**
 * BigInt-based proration helper that operates in minor units.
 * Returns proration amounts in minor units (bigint).
 */
export function calculateProrationMinorFromPeriod(
  oldMinor: bigint,
  newMinor: bigint,
  periodStart: Date,
  periodEnd: Date,
  now = new Date(),
): { prorationChargeMinor: bigint; prorationCreditMinor: bigint; amountDueMinor: bigint } {
  if (!periodStart || !periodEnd) throw new Error('Invalid subscription period');

  const totalPeriodMs = BigInt(periodEnd.getTime() - periodStart.getTime());
  if (totalPeriodMs <= 0n) throw new Error('Invalid subscription period length');

  const remainingMs = BigInt(Math.max(0, periodEnd.getTime() - now.getTime()));
  // signed raw prorated delta in minor units
  const delta = newMinor - oldMinor; // can be negative for downgrade
  const raw = (delta * remainingMs) / totalPeriodMs; // BigInt division truncates toward zero

  if (raw === 0n) return { prorationChargeMinor: 0n, prorationCreditMinor: 0n, amountDueMinor: 0n };

  if (raw > 0n) {
    // charge to customer
    return { prorationChargeMinor: raw, prorationCreditMinor: 0n, amountDueMinor: raw };
  }

  // refund/credit to customer
  const credit = -raw;
  return { prorationChargeMinor: 0n, prorationCreditMinor: credit, amountDueMinor: 0n };
}
