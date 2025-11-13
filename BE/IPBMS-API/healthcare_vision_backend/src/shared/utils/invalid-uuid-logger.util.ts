import { Logger } from '@nestjs/common';

const logger = new Logger('InvalidUuidLogger');

function maskAuth(header?: string) {
  if (!header) return undefined;
  // Keep scheme and mask rest (e.g. "Bearer xxxxxx") -> "Bearer <redacted>"
  const parts = header.split(' ');
  if (parts.length >= 2) return `${parts[0]} <redacted>`;
  return '<redacted>';
}

function summarizeBody(body: any) {
  if (!body) return undefined;
  try {
    // Avoid dumping big payloads: only include top-level keys and types
    const keys = Object.keys(body || {}).slice(0, 10);
    const summary: Record<string, string> = {};
    for (const k of keys) {
      const v = body[k];
      if (typeof v === 'string') summary[k] = v.length > 64 ? `${v.slice(0, 64)}...` : v;
      else if (typeof v === 'object')
        summary[k] = Array.isArray(v) ? `array(${v.length})` : 'object';
      else summary[k] = String(v);
    }
    return summary;
  } catch {
    return undefined;
  }
}

export function logInvalidUuidOccurrence(req: any, reason: string, extra?: Record<string, any>) {
  try {
    const headers = req?.headers || {};
    const payload: any = {
      reason,
      route: req?.route?.path || req?.originalUrl || req?.url,
      method: req?.method,
      ip: req?.ip || headers['x-forwarded-for'] || req?.connection?.remoteAddress,
      user: req?.user ? { userId: req.user.userId, role: req.user.role } : undefined,
      params: req?.params,
      query: req?.query,
      bodySummary: summarizeBody(req?.body),
      headers: {
        authorization: maskAuth(headers.authorization || headers.Authorization),
        'x-forwarded-for': headers['x-forwarded-for'],
      },
      extra: extra || undefined,
    };

    // Log structured JSON string to make it easy for log collectors
    logger.warn(JSON.stringify(payload));
  } catch (err) {
    try {
      logger.warn(`Failed to log invalid UUID occurrence: ${String(err)}`);
    } catch {
      // swallow
    }
  }
}
