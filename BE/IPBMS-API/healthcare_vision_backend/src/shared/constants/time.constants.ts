/**
 * Time-related constants used throughout the application
 */

// Milliseconds
export const TIME_MS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

// Hours
export const TIME_HOURS = {
  CAREGIVER_PROPOSAL_TTL: 48, // 48 hours for caregiver to confirm events
  CAREGIVER_ACCESS_WINDOW: 48, // 48 hours window for caregiver access to events
} as const;

// Milliseconds calculated from hours
export const TIME_LIMITS_MS = {
  CAREGIVER_PROPOSAL_TTL: TIME_HOURS.CAREGIVER_PROPOSAL_TTL * TIME_MS.HOUR,
  CAREGIVER_ACCESS_WINDOW: TIME_HOURS.CAREGIVER_ACCESS_WINDOW * TIME_MS.HOUR,
} as const;

// Helper functions
export const timeUtils = {
  /**
   * Calculate age of a date in milliseconds
   */
  getAge(date: Date | string | null): number | null {
    if (!date) return null;
    return Date.now() - new Date(date).getTime();
  },

  /**
   * Check if a date is within a time window (in milliseconds)
   */
  isWithinWindow(date: Date | string | null, windowMs: number): boolean {
    const age = this.getAge(date);
    return age !== null && age <= windowMs;
  },

  /**
   * Get future timestamp from now + milliseconds
   */
  getFutureTimestamp(ms: number): Date {
    return new Date(Date.now() + ms);
  },

  /**
   * Calculate remaining time in access window from detected_at
   * Returns null if already expired
   */
  getRemainingAccessTime(detectedAt: Date | string | null, windowMs: number): number | null {
    if (!detectedAt) return null;
    const deadline = new Date(detectedAt).getTime() + windowMs;
    const remaining = deadline - Date.now();
    return remaining > 0 ? remaining : null;
  },

  /**
   * Calculate safe pending_until that respects both TTL and access window
   * Ensures pending_until never exceeds detected_at + access window
   * @param detectedAt - Event detection timestamp
   * @param ttlMs - Desired TTL in milliseconds
   * @param accessWindowMs - Access window limit in milliseconds
   * @returns Safe pending_until Date, or null if no time remaining
   */
  getSafePendingUntil(
    detectedAt: Date | string | null,
    ttlMs: number,
    accessWindowMs: number,
  ): Date | null {
    if (!detectedAt) return null;

    const accessDeadline = new Date(detectedAt).getTime() + accessWindowMs;
    const proposedDeadline = Date.now() + ttlMs;

    // Use the earlier of the two deadlines
    const safePendingUntil = Math.min(proposedDeadline, accessDeadline);

    // Ensure there's actually time remaining
    if (safePendingUntil <= Date.now()) {
      return null;
    }

    return new Date(safePendingUntil);
  },

  /**
   * Format a date into a timezone-aware ISO string with offset.
   * Example: 2025-11-09T09:09:32.769+07:00
   * Uses Intl as a fallback; prefer moment-timezone if available in runtime.
   */
  toTimezoneIsoString(date: Date | string | null, tz = 'Asia/Ho_Chi_Minh'): string | null {
    if (!date) return null;
    try {
      // Use Intl.DateTimeFormat to get components and build an ISO-like string with offset
      const d = new Date(date);
      // Convert to target timezone via toLocaleString components
      const parts: any = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
        .formatToParts(d)
        .reduce((acc: any, p: any) => ({ ...acc, [p.type]: p.value }), {});

      const ms = `${d.getMilliseconds()}`.padStart(3, '0');
      const dateStr = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${ms}`;

      // As a simple fallback, append +07:00 for known VN tz
      const offset = '+07:00';
      return `${dateStr}${offset}`;
    } catch {
      return new Date(date).toISOString();
    }
  },

  /**
   * Human-friendly local representation for VN (DD/MM/YYYY HH:mm:ss)
   */
  toVnLocalString(date: Date | string | null): string | null {
    if (!date) return null;
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date(date));
    } catch {
      return new Date(date).toLocaleString('vi-VN');
    }
  },
} as const;
