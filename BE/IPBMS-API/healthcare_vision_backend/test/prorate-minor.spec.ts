import { prorateMinor } from '../src/shared/utils/proration.util';

describe('prorateMinor (BigInt)', () => {
  it('calculates prorated amount correctly in minor units', () => {
    // old price 100000 VND, new price 200000 VND -> delta = 100000 => minor delta 100000*100 = 10000000n
    const oldMinor = BigInt(100000) * 100n;
    const newMinor = BigInt(200000) * 100n;
    const totalMs = BigInt(1000);
    const remainingMs = BigInt(500); // half period

    const result = prorateMinor(oldMinor, newMinor, remainingMs, totalMs);
    // expected deltaMinor * remaining/total = 10000000 * 500/1000 = 5000000
    expect(result).toBe(5000000n);
  });

  it('returns 0 for zero total period', () => {
    const r = prorateMinor(100n, 200n, 10n, 0n);
    expect(r).toBe(0n);
  });
});
