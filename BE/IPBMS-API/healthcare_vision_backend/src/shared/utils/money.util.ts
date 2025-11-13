export const toMinor = (majorVnd: number | bigint): bigint => {
  const n = Number(majorVnd ?? 0);
  // VND has no decimals, but keep *100 to standardize minor units (cents)
  return BigInt(Math.round(n * 100));
};

export const toMajor = (minorVnd: bigint | number): number => {
  const n = typeof minorVnd === 'bigint' ? Number(minorVnd) : Number(minorVnd ?? 0);
  return n / 100;
};

export const roundMajor = (major: number): number => Math.round(major);
