import { BadRequestException } from '@nestjs/common';

/**
 * Parse a preference row (user_preferences.setting_value) to decide if it's currently muting.
 */
function isPrefMuted(pref: any, now?: Date): { muted: boolean; reason?: string } {
  const _now = now ?? new Date();
  const nowTs = _now.getTime();
  if (!pref || !pref.is_enabled) return { muted: false };
  try {
    const parsed =
      typeof pref.setting_value === 'string' ? JSON.parse(pref.setting_value) : pref.setting_value;
    if (!parsed) return { muted: false };
    if (parsed.until === null) return { muted: true, reason: parsed.reason };
    if (parsed.until) {
      const u = new Date(parsed.until);
      if (!isNaN(u.getTime()) && u.getTime() > nowTs) return { muted: true, reason: parsed.reason };
    }
    return { muted: false };
  } catch {
    return { muted: false };
  }
}

/**
 * Determine whether a suggestion is muted for a user given a pref map.
 * prefsMap shape: { [userId]: { [setting_key]: UserPreferenceRow } }
 */
export function isMutedForUser(
  suggestion: any,
  prefsMap: Record<string, Record<string, any>>,
  nowOverride?: Date,
): { muted: boolean; reason?: string; prefKey?: string } {
  const now = nowOverride ?? new Date();
  const nowTs = now.getTime();
  const userId = suggestion?.user_id;
  const result = {
    muted: false,
    reason: undefined as string | undefined,
    prefKey: undefined as string | undefined,
  };
  if (!userId) return result;

  const userPrefs = prefsMap[userId] ?? {};

  // precedence: mute:all > mute:type:<type> > item.skip_until
  const prefAll = userPrefs['mute:all'];
  const rAll = isPrefMuted(prefAll, now);
  if (rAll.muted) return { muted: true, reason: rAll.reason, prefKey: 'mute:all' };

  if (suggestion?.type) {
    const prefType = userPrefs[`mute:type:${suggestion.type}`];
    const rType = isPrefMuted(prefType, now);
    if (rType.muted)
      return { muted: true, reason: rType.reason, prefKey: `mute:type:${suggestion.type}` };
  }

  if (suggestion?.skip_until) {
    const su = new Date(suggestion.skip_until);
    if (!isNaN(su.getTime()) && su.getTime() > nowTs)
      return { muted: true, reason: suggestion.skip_reason };
  }

  return result;
}

export function parseDurationToDate(duration: string | undefined, untilDate?: string): Date | null {
  const now = new Date();
  if (!duration) return null;
  if (duration === 'until_change') return null;
  if (duration === 'until_date') {
    if (!untilDate) throw new BadRequestException('until_date is required for duration until_date');
    const d = new Date(untilDate);
    if (isNaN(d.getTime())) throw new BadRequestException('until_date is invalid');
    if (d.getTime() < Date.now()) throw new BadRequestException('until_date must be in the future');
    return d;
  }

  const mapping: Record<string, number> = {
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '8h': 8 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '2d': 2 * 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  const ms = mapping[duration as string];
  if (!ms) return null;
  return new Date(now.getTime() + ms);
}
