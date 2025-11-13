import { FcmUtils } from '../../application/services/fcm/fcm.utils';
import { sanitizeRecipients as _sanitizeRecipients } from './fcm.helpers';
import type { DeviceSyncMessage } from '../services/device-sync.service';

export type SyncPriority = 'low' | 'normal' | 'high';

export function buildSyncMessage(
  type: 'sync' | 'command' | 'data' | 'notification',
  payload: any,
  priority: SyncPriority = 'normal',
  ttl?: number,
): DeviceSyncMessage {
  return {
    type,
    payload,
    priority,
    ttl,
  } as DeviceSyncMessage;
}

export function isValidSyncMessage(msg: any): msg is DeviceSyncMessage {
  if (!msg || typeof msg !== 'object') return false;
  if (!msg.type || !['sync', 'command', 'data', 'notification'].includes(msg.type)) return false;
  if (!('payload' in msg)) return false;
  return true;
}

export function normalizeDeviceId(deviceId?: string): string | undefined {
  if (!deviceId) return undefined;
  return String(deviceId).trim();
}

export function chunkRecipients(recipients: string[], size = 100): string[][] {
  return FcmUtils.chunk(recipients || [], size);
}

export function sanitizeAndChunkRecipients(recipients: any, requesterId?: string, size = 100) {
  const sanitized = _sanitizeRecipients(recipients, requesterId);
  return chunkRecipients(sanitized, size);
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseMs = 200,
): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const wait = baseMs * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

export default {
  buildSyncMessage,
  isValidSyncMessage,
  normalizeDeviceId,
  chunkRecipients,
  sanitizeAndChunkRecipients,
  retryWithBackoff,
};
