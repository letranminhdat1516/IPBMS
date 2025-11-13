import { PushPlatformEnum } from '../../../core/entities/fcm-token.entity';
import { Audience } from '../../../core/types/fcm.types';

// FCM Utility Functions
export class FcmUtils {
  /**
   * Chunk array into smaller arrays of specified size
   */
  static chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  /**
   * Build topics object for FCM token
   */
  static buildTopics(audience: Audience) {
    return { audience, audiences: [audience] };
  }

  /**
   * Merge existing topics with new audience
   */
  static mergeTopics(existing: any, audience: Audience) {
    const out: any = { ...(existing || {}) };
    // legacy single value
    out.audience = audience;
    const prev: string[] = Array.isArray(existing?.audiences)
      ? existing.audiences
      : existing?.audience
        ? [existing.audience]
        : [];
    const set = new Set<string>([...prev, audience]);
    out.audiences = Array.from(set);
    return out;
  }

  /**
   * Normalize platform string to PushPlatformEnum
   */
  static normalizePlatform(p?: string): PushPlatformEnum {
    const v = String(p || '').toLowerCase();
    if (v === 'android') return PushPlatformEnum.android;
    if (v === 'ios') return PushPlatformEnum.ios;
    return PushPlatformEnum.web;
  }

  /**
   * Sleep utility for retry logic
   */
  static sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  /**
   * Humanize event type for notifications
   */
  static humanizeEvent(ev: string): string {
    const m: Record<string, string> = {
      fall: 'Phát hiện té ngã',
      seizure: 'Phát hiện co giật',
      abnormal: 'Hành vi bất thường',
    };
    return m[ev] ?? 'Cảnh báo an toàn';
  }
}
