export function chunkArray<T>(arr: T[], size = 50): T[][] {
  if (!Array.isArray(arr) || size <= 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export function flatten<T>(arrs: T[][]): T[] {
  return (arrs || []).reduce((acc, cur) => acc.concat(cur || []), [] as T[]);
}

export default { chunkArray, flatten };
