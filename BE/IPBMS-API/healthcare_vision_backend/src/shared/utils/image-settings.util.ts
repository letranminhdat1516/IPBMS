export function parseIntOrNull(raw: any): number | null {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  return Number.isNaN(n) ? null : n;
}

export function parseQuality(raw: any): string {
  if (raw === null || raw === undefined) return '';
  const s = String(raw);
  const m = s.match(/(\d+)/);
  if (m) return m[1];
  return s;
}

export function pickIntFromMaps(
  userMap: Map<string, any>,
  sysMap: Map<string, any>,
  candidates: string[],
  fallback: number,
): number {
  for (const k of candidates) {
    const u = userMap.get(k);
    if (u && u.is_overridden) {
      const n = parseIntOrNull(u.value);
      if (n !== null) return n;
    }
    const s = sysMap.get(k);
    if (s) {
      const n = parseIntOrNull(s.setting_value);
      if (n !== null) return n;
    }
  }
  return fallback;
}

export function pickQualityFromMaps(
  userMap: Map<string, any>,
  sysMap: Map<string, any>,
  candidates: string[],
  fallback: string,
): string {
  for (const k of candidates) {
    const u = userMap.get(k);
    if (u && u.is_overridden && u.value) {
      return parseQuality(u.value);
    }
    const s = sysMap.get(k);
    if (s && s.setting_value) {
      return parseQuality(s.setting_value);
    }
  }
  return fallback;
}
