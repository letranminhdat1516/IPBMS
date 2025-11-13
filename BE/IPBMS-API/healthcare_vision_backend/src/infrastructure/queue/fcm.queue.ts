import { Logger } from '@nestjs/common';
import { FcmNotificationPayload, FcmSendOptions } from '../../core/types/fcm.types';

const logger = new Logger('FcmQueue');

// Simple file-based enqueue function: append failed chunks to a JSON file (DLQ).
export async function enqueueFcmRetry(
  tokens: string[],
  payload: FcmNotificationPayload | any,
  opts?: FcmSendOptions,
) {
  try {
    const path = process.env.FCM_DLQ_PATH ?? './fcm_dlq.json';
    let existing: any[] = [];
    try {
      const raw = await (await import('fs')).promises.readFile(path, 'utf8');
      existing = JSON.parse(raw || '[]');
    } catch {
      existing = [];
    }
    existing.push({ tokens, payload, opts, timestamp: new Date().toISOString() });
    await (await import('fs')).promises.writeFile(path, JSON.stringify(existing, null, 2), 'utf8');
    return true;
  } catch (err) {
    logger.error('[fcm.queue] Failed to enqueue to DLQ file', String(err));
    return false;
  }
}
