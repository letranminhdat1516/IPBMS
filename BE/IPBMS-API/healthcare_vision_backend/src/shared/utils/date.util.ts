export function parseISOToDate(val: any): Date | undefined {
  if (val === undefined || val === null) return undefined;
  if (val instanceof Date) return isNaN(val.getTime()) ? undefined : val;
  if (typeof val !== 'string') return undefined;
  const s = val.trim();
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

export default parseISOToDate;
