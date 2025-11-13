export type NotificationChannel = 'push' | 'sms' | 'call';

export type SharedPermissions = {
  stream_view?: boolean;
  alert_read?: boolean;
  alert_ack?: boolean;
  profile_view?: boolean;
  notification_channel?: NotificationChannel[];
  log_access_days?: number;
  report_access_days?: number;
  [key: string]: any; // allow extensions
};

export const SHARED_PERMISSIONS_EXAMPLE: SharedPermissions = {
  stream_view: true,
  alert_read: true,
  alert_ack: false,
  log_access_days: 7,
  report_access_days: 30,
  notification_channel: ['push', 'sms'],
  profile_view: true,
};

function isBooleanLike(v: any): boolean {
  return typeof v === 'boolean' || v === 'true' || v === 'false';
}

function toBoolean(v: any): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return Boolean(v);
}

function isNumberLike(v: any): boolean {
  return (
    typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)))
  );
}

function toNumber(v: any): number {
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

export function validateSharedPermissions(obj: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (obj == null) return { valid: true, errors };
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    errors.push('access_grants must be an object');
    return { valid: false, errors };
  }

  const booleanKeys = ['stream_view', 'alert_read', 'alert_ack', 'profile_view'];
  for (const k of booleanKeys) {
    if (k in obj && !isBooleanLike(obj[k])) errors.push(`${k} must be boolean`);
  }

  if ('notification_channel' in obj) {
    if (!Array.isArray(obj.notification_channel)) {
      errors.push('notification_channel must be an array');
    } else {
      for (const c of obj.notification_channel) {
        if (c !== 'push' && c !== 'sms' && c !== 'call')
          errors.push(`notification_channel contains invalid value: ${c}`);
      }
    }
  }

  const numberKeys = ['log_access_days', 'report_access_days'];
  for (const k of numberKeys) {
    if (k in obj && !isNumberLike(obj[k])) errors.push(`${k} must be a number`);
  }

  return { valid: errors.length === 0, errors };
}

export function normalizeSharedPermissions(obj: any): SharedPermissions | null {
  if (obj == null) return null;
  if (typeof obj !== 'object' || Array.isArray(obj)) return null;
  // Allow callers to pass colon-style keys (e.g. 'alert:read') — normalize input first
  const input: Record<string, any> = {};
  for (const k of Object.keys(obj)) {
    input[k] = obj[k];
    if (k.includes(':')) input[k.replace(/:/g, '_')] = obj[k];
  }

  const out: SharedPermissions = {};

  if ('stream_view' in input) out.stream_view = toBoolean(input.stream_view);
  if ('alert_read' in input) out.alert_read = toBoolean(input.alert_read);
  if ('alert_ack' in input) out.alert_ack = toBoolean(input.alert_ack);
  if ('profile_view' in input) out.profile_view = toBoolean(input.profile_view);

  if ('notification_channel' in input && Array.isArray(input.notification_channel)) {
    out.notification_channel = Array.from(
      new Set(
        input.notification_channel
          .map((c: any) => String(c).toLowerCase())
          .filter((c: string) => c === 'push' || c === 'sms' || c === 'call'),
      ),
    ) as NotificationChannel[];
  }

  if ('log_access_days' in input && isNumberLike(input.log_access_days))
    out.log_access_days = Math.max(0, Math.floor(toNumber(input.log_access_days)));

  if ('report_access_days' in input && isNumberLike(input.report_access_days))
    out.report_access_days = Math.max(0, Math.floor(toNumber(input.report_access_days)));

  // copy unknown keys as-is
  for (const k of Object.keys(obj)) {
    if (!(k in out)) out[k] = obj[k];
  }

  // also expose colon-style boolean keys for compatibility with callers/tests
  if ('stream_view' in out) (out as any)['stream:view'] = out.stream_view;
  if ('alert_read' in out) (out as any)['alert:read'] = out.alert_read;
  if ('alert_ack' in out) (out as any)['alert:ack'] = out.alert_ack;
  if ('profile_view' in out) (out as any)['profile:view'] = out.profile_view;

  return out;
}

export function hasBooleanPermission(
  shared: SharedPermissions | null | undefined,
  key: 'stream_view' | 'alert_read' | 'alert_ack' | 'profile_view' | string,
): boolean {
  if (!shared) return false;
  // allow colon style keys from older callers (e.g. 'alert:read')
  const normalized = key.replace(/:/g, '_');
  const asNorm = (shared as any)[normalized];
  if (asNorm !== undefined) return Boolean(asNorm);
  // fall back to original key (colon-style) if present
  const asOriginal = (shared as any)[key];
  return Boolean(asOriginal);
}

export function getRetentionDays(
  shared: SharedPermissions | null | undefined,
  key: 'log_access_days' | 'report_access_days',
): number {
  if (!shared) return 0;
  const v = shared[key];
  if (typeof v === 'number') return Math.max(0, Math.floor(v));
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.floor(n));
  }
  return 0;
}

export function hasNotificationChannel(
  shared: SharedPermissions | null | undefined,
  channel: NotificationChannel,
): boolean {
  if (!shared || !shared.notification_channel) return false;
  return shared.notification_channel.includes(channel);
}

export function getPermission<T = any>(
  shared: SharedPermissions | null | undefined,
  key: string,
): T | undefined {
  if (!shared) return undefined;
  return shared[key] as T;
}

export default {
  validateSharedPermissions,
  normalizeSharedPermissions,
  hasBooleanPermission,
  getRetentionDays,
  hasNotificationChannel,
  getPermission,
};
