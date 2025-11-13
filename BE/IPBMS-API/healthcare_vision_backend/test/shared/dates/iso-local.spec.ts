import { formatIsoLocal } from '../../../src/shared/dates/iso-local';

describe('formatIsoLocal', () => {
  it('returns an ISO-like local timestamp with timezone offset', () => {
    const d = new Date('2025-10-27T00:00:00Z');
    const s = formatIsoLocal(d);
    // Basic pattern check: YYYY-MM-DDTHH:MM:SS+hh:mm or -hh:mm
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });

  it('round-trips to the same instant when parsed', () => {
    const d = new Date('2025-10-27T12:34:56Z');
    const s = formatIsoLocal(d);
    const parsed = new Date(s);
    // The epoch millis should match (string includes timezone offset so parsing yields same instant)
    expect(parsed.getTime()).toBe(d.getTime());
  });
});
