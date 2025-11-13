import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { promises as fs } from 'fs';
import { PushPlatformEnum } from '../../../core/entities/fcm-token.entity';
import {
  Audience,
  FcmConstants,
  FcmMulticastResult,
  FcmNotificationPayload,
  FcmSendOptions,
} from '../../../core/types/fcm.types';
import { FcmTokenRepository } from '../../../infrastructure/repositories/notifications/fcm-token.repository';
import { AssignmentsRepository } from '../../../infrastructure/repositories/users/assignments.repository';
import { FIREBASE_MESSAGING } from '../../../modules/firebase/firebase.module';
import { MonitoringService } from '../../../shared/services/monitoring.service';
import { FcmUtils } from './fcm.utils';

@Injectable()
export class FcmCoreService {
  private readonly logger = new Logger(FcmCoreService.name);
  private messaging: any;
  // store last multicast result for quick inspection/debugging
  private lastMulticastResult: any = null;
  // In-memory retry queue for failed chunks (temporary placeholder before persistent queue)
  private retryQueue: Array<{
    tokens: string[];
    payload: FcmNotificationPayload;
    opts?: FcmSendOptions;
    attempts: number;
  }> = [];
  private dlq: Array<{
    tokens: string[];
    payload: FcmNotificationPayload;
    opts?: FcmSendOptions;
    attempts: number;
    lastError?: any;
  }> = [];
  private retryWorkerTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly _fcmTokenRepo: FcmTokenRepository,
    private readonly _assignmentsRepo: AssignmentsRepository,
    @Optional() @Inject(FIREBASE_MESSAGING) messaging: any,
    private readonly _monitoringService?: MonitoringService,
  ) {
    // assign injected messaging instance
    this.messaging = messaging;
    // start background retry worker only when messaging is available
    if (this.messaging) {
      this.startRetryWorker();
    }
  }

  // ---------------- Query tokens theo audience ----------------
  async getAudienceTokensByUserIds(
    userIds: string[],
    audiences?: Audience[],
    platform?: PushPlatformEnum,
    activeOnly = true,
  ) {
    if (!userIds?.length) return [];

    this.logger.debug('[getAudienceTokensByUserIds] input', {
      userIds: userIds.length,
      audiences,
      platform,
      activeOnly,
    });

    const tokens = await this._fcmTokenRepo.findTokensByUserIds(userIds, {
      audiences,
      platform,
      activeOnly,
    });

    this.logger.debug('[getAudienceTokensByUserIds] found tokens', { count: tokens.length });

    return [...new Set(tokens.map((t) => t.token))]; // dedupe
  }

  // New: query one time and return grouped tokens by user + unique tokens list
  async getAudienceTokensGroupedByUser(
    userIds: string[],
    audiences?: Audience[],
    platform?: PushPlatformEnum,
    activeOnly = true,
  ): Promise<{ tokens: string[]; map: Record<string, string[]> }> {
    const outMap: Record<string, string[]> = {};
    const uniq = new Set<string>();
    if (!userIds?.length) return { tokens: [], map: outMap };

    this.logger.debug('[getAudienceTokensGroupedByUser] input', {
      userIds: userIds.length,
      audiences,
      platform,
      activeOnly,
    });

    const tokenRecords = await this._fcmTokenRepo.findTokensByUserIds(userIds, {
      audiences,
      platform,
      activeOnly,
    });

    this.logger.debug('[getAudienceTokensGroupedByUser] found token records', {
      count: tokenRecords.length,
    });

    for (const record of tokenRecords) {
      const uid = record.user_id;
      const tok = record.token;
      if (!uid || !tok) continue;
      (outMap[uid] ||= []).push(tok);
      uniq.add(tok);
    }
    return { tokens: Array.from(uniq), map: outMap };
  }

  // ---------------- Gửi multicast có chunk + cleanup ----------------
  async sendMulticast(
    tokens: string[],
    payload: FcmNotificationPayload,
    opts?: FcmSendOptions,
  ): Promise<FcmMulticastResult> {
    this.logger.debug('[sendMulticast] Bắt đầu gửi multicast', {
      totalTokens: tokens.length,
      collapseKey: opts?.collapseKey,
      ttlSeconds: opts?.ttlSeconds,
      includeResponses: opts?.includeResponses ?? true,
      notificationTitle: payload.notification?.title,
      dataKeys: Object.keys(payload.data || {}),
    });

    if (!tokens.length) {
      this.logger.debug('[sendMulticast] Không có token nào được cung cấp');
      return { successCount: 0, failureCount: 0, responses: [] };
    }

    // If Firebase Messaging is not available (e.g. running in a limited environment),
    // return a safe failure result instead of throwing so callers can handle degraded mode.
    if (!this.messaging) {
      this.logger.warn('[sendMulticast] Firebase messaging không khả dụng - bỏ qua gửi');
      // report metric or alert if monitoring available
      try {
        if (
          this._monitoringService &&
          typeof this._monitoringService?.reportMetric === 'function'
        ) {
          // defensive: if monitoring service available, report metric
          try {
            this._monitoringService
              .reportMetric('fcm.messaging_unavailable', 1, {
                env: process.env.NODE_ENV ?? 'unknown',
              })
              .catch(() => {});
          } catch {}
        }
      } catch {
        // swallow monitoring errors
      }

      // Mark all tokens as failed in the response so callers see there was no delivery.
      const responses = tokens.map((t, i) => ({
        index: i,
        success: false,
        error: { message: 'Firebase messaging không khả dụng' },
      })) as any[];
      // record last result for debugging
      this.lastMulticastResult = { successCount: 0, failureCount: tokens.length, responses };
      return { successCount: 0, failureCount: tokens.length, responses };
    }

    // Ensure there is a notification object for platforms (Android/iOS) that
    // require it to show system notifications when the app is backgrounded.
    // If the caller only provided a data-only payload, synthesize a reasonable
    // notification from data fields or known types so background devices still
    // display an OS notification.
    const originalNotification = payload.notification;

    // If original payload was data-only (no notification), record metric/log so
    // we can detect all callers that send data-only messages and address them.
    if (!originalNotification) {
      try {
        this.logger.warn('[sendMulticast] data-only FCM payload detected', {
          dataType: (payload.data as any)?.type,
          dataKeys: Object.keys(payload.data || {}).slice(0, 10),
          tokenCount: tokens.length,
        });
        if (this._monitoringService && typeof this._monitoringService.reportMetric === 'function') {
          // report a generic metric; monitoring backend can aggregate by type tag
          await this._monitoringService.reportMetric('fcm.sent_data_only', 1, {
            type: (payload.data as any)?.type || 'unknown',
            env: process.env.NODE_ENV ?? 'unknown',
          });
        }
      } catch {
        // swallow monitoring/log errors here
      }
    }

    const synthesizedNotification =
      payload.notification ??
      (payload.data
        ? (() => {
            // Prefer explicit title/body in data if present
            const dt: any = payload.data as any;
            const maybeTitle = dt.title || dt.notification_title || undefined;
            const maybeBody = dt.body || dt.notification_body || undefined;
            if (maybeTitle || maybeBody) return { title: maybeTitle, body: maybeBody };

            // Known types: map to human-friendly defaults
            if (dt.type === 'event_confirmation_request') {
              return {
                title: 'Yêu cầu xác nhận thay đổi sự kiện',
                body: dt.message || 'Bạn có một yêu cầu cần phản hồi',
              };
            }
            if (dt.type === 'system_event') {
              return {
                title: dt.eventType ? `Cảnh báo: ${dt.eventType}` : 'Cảnh báo an toàn',
                body: dt.message || dt.eventType || 'Bạn có một cảnh báo mới',
              };
            }
            if (dt.type === 'actor_message') {
              return {
                title: 'Tin nhắn mới',
                body: dt.message || 'Bạn có tin nhắn mới',
              };
            }

            // Fallback: no good title/body available
            return undefined;
          })()
        : undefined);

    const base: Omit<any, 'tokens'> = {
      notification: synthesizedNotification ?? payload.notification,
      data: payload.data,
      android: {
        priority: 'high',
        collapseKey: opts?.collapseKey,
        ttl: opts?.ttlSeconds ? opts.ttlSeconds * 1000 : undefined,
        notification: {
          channelId: 'alerts',
          sound: 'default',
          clickAction: 'OPEN_DEEPLINK',
        },
        ...payload.android,
      },
      apns: {
        headers: {
          'apns-push-type': 'alert',
          'apns-priority': '10',
          ...(opts?.ttlSeconds
            ? { 'apns-expiration': String(Math.floor(Date.now() / 1000) + opts.ttlSeconds) }
            : {}),
          ...(opts?.collapseKey ? { 'apns-collapse-id': opts.collapseKey } : {}),
        },
        payload: { aps: { sound: 'default', badge: 1 } },
        ...payload.apns,
      },
      // WebPush realtime hơn với Urgency + TTL
      webpush: {
        headers: {
          ...(opts?.ttlSeconds ? { TTL: String(opts.ttlSeconds) } : {}),
          Urgency: 'high',
        },
        fcmOptions: { link: payload?.data?.deeplink || 'https://yourapp.example' },
        ...(payload.webpush ?? {}),
      },
    };

    const chunks = FcmUtils.chunk(tokens, FcmConstants.CHUNK_SIZE);
    const raw = Number(process.env.FCM_CONCURRENCY ?? FcmConstants.DEFAULT_CONCURRENCY);
    const desired = Number.isFinite(raw) ? raw : FcmConstants.DEFAULT_CONCURRENCY;
    const concurrency = Math.max(1, Math.min(desired, chunks.length));

    this.logger.debug('[sendMulticast] Cấu hình phân mảnh (chunking)', {
      totalTokens: tokens.length,
      chunkSize: FcmConstants.CHUNK_SIZE,
      totalChunks: chunks.length,
      concurrency,
      estimatedConcurrentBatches: Math.ceil(chunks.length / concurrency),
    });
    let idx = 0;

    let successCount = 0;
    let failureCount = 0;
    const allResponses: any[] = [];
    const toDeactivate: string[] = [];

    await Promise.all(
      Array.from({ length: concurrency }).map(async () => {
        while (true) {
          const i = idx++;
          if (i >= chunks.length) break;
          const chunk = chunks[i];

          this.logger.debug(`Xử lý chunk ${i + 1}/${chunks.length}`, {
            chunkSize: chunk.length,
            tokens: chunk.slice(0, 3).map((t) => t.substring(0, 20) + '...'), // Log first 3 tokens (truncated)
          });

          // Never throw from chunk-level failures. Use a helper that will do
          // exponential backoff retries for transient errors and return a
          // structured result. Permanently failing chunks will be enqueued for
          // background retries (DLQ placeholder) so the request flow is not
          // interrupted.
          const res = await this.sendChunkWithRetries(chunk, base, i);
          successCount += res.successCount;
          failureCount += res.failureCount;
          if (opts?.includeResponses ?? true) {
            allResponses.push(...res.responses);
          }
          (res.responses as any[]).forEach((r: any, j: number) => {
            const code = r?.error?.code ?? '';
            if (
              !r.success &&
              (code === 'messaging/registration-token-not-registered' ||
                code === 'messaging/invalid-registration-token' ||
                code === 'messaging/unregistered')
            ) {
              toDeactivate.push(chunk[j]);
            }
          });
        }
      }),
    );

    if (toDeactivate.length) {
      this.logger.log('[Vô hiệu hóa token không hợp lệ]', {
        count: toDeactivate.length,
        tokens: toDeactivate.slice(0, 5).map((t) => t.substring(0, 20) + '...'), // Log first 5 (truncated)
      });

      await this._fcmTokenRepo.updateTokensAsInactive(toDeactivate);

      this.logger.debug('[Đã vô hiệu hóa token không hợp lệ thành công]');
    }
    await this._fcmTokenRepo.updateTokensLastUsed(tokens);

    // Monitoring: compute invalid token rate and report/alert if high
    try {
      const total = successCount + failureCount;
      const invalidCount = toDeactivate.length;
      const invalidRate = total > 0 ? invalidCount / total : 0;
      const threshold = Number(
        process.env.FCM_INVALID_TOKEN_RATE_THRESHOLD ?? FcmConstants.INVALID_TOKEN_RATE_THRESHOLD,
      );
      // report metric
      if (this._monitoringService && typeof this._monitoringService.reportMetric === 'function') {
        await this._monitoringService.reportMetric('fcm.invalid_token_rate', invalidRate, {
          env: process.env.NODE_ENV ?? 'unknown',
        });
      }
      if (invalidRate >= threshold) {
        if (this._monitoringService && typeof this._monitoringService.alert === 'function') {
          await this._monitoringService.alert('fcm_invalid_token_rate_high', {
            invalidRate,
            invalidCount,
            total,
            threshold,
          });
        }
      }
    } catch (_err) {
      // swallow monitoring errors to avoid impacting push flow
      this.logger.warn('Lỗi monitoring trong FcmCoreService.sendMulticast:', _err);
    }

    if (opts?.includeResponses ?? true) {
      // Optimize responses: only include essential information
      const optimizedResponses = allResponses.map((response, index) => ({
        index,
        success: response.success,
        messageId: response.messageId,
        error: response.success ? undefined : response.error,
      }));

      this.logger.log('[sendMulticast] Hoàn thành với kết quả chi tiết', {
        totalTokens: tokens.length,
        successCount,
        failureCount,
        responseCount: optimizedResponses.length,
        invalidTokensDeactivated: toDeactivate.length,
      });

      const result = {
        successCount,
        failureCount,
        responses: optimizedResponses,
      };
      this.lastMulticastResult = result;
      return result;
    }

    this.logger.log('[sendMulticast] Hoàn thành (tóm tắt)', {
      totalTokens: tokens.length,
      successCount,
      failureCount,
      invalidTokensDeactivated: toDeactivate.length,
    });

    const result = { successCount, failureCount };
    this.lastMulticastResult = result;
    return result;
  }

  /**
   * Return a lightweight status for Firebase messaging and the last multicast result.
   * Useful for debugging when client reports successCount but device does not receive.
   */
  getStatus() {
    return {
      initialized: !!this.messaging,
      lastMulticastResult: this.lastMulticastResult,
    };
  }

  // ---------------- Business helpers ----------------
  async getCaregiverUserIdsForCustomer(customerId: string): Promise<string[]> {
    try {
      const assignments = await this._assignmentsRepo.findCaregiversOfCustomer(
        customerId,
        'accepted',
      );
      return assignments?.map((a: any) => a.caregiver_id).filter(Boolean) ?? [];
    } catch {
      return [];
    }
  }

  /** Lọc recipients hợp lệ theo quan hệ assignment (assignment relationships) */
  async filterDeliverableTargets(
    fromUserId: string,
    toUserIds: string[],
    direction: 'customer_to_caregiver' | 'caregiver_to_customer',
  ) {
    if (!toUserIds?.length) return [];

    // Lấy danh sách allowed recipients dựa vào direction
    let allowedRecipientIds: string[] = [];

    if (direction === 'customer_to_caregiver') {
      // Customer gửi → lấy danh sách caregivers của customer này
      const assignments = await this._assignmentsRepo.findCaregiversOfCustomer(
        fromUserId,
        'accepted',
      );
      allowedRecipientIds = assignments.map((a: any) => a.caregiver_id);
    } else if (direction === 'caregiver_to_customer') {
      // Caregiver gửi → lấy danh sách customers của caregiver này
      const assignments = await this._assignmentsRepo.findCustomersOfCaregiver(
        fromUserId,
        'accepted',
      );
      allowedRecipientIds = assignments.map((a: any) => a.customer_id);
    }

    // Filter toUserIds: chỉ giữ những ID có trong allowedRecipientIds
    const filtered = toUserIds.filter((id) => allowedRecipientIds.includes(id));
    return filtered;
  }

  // ---------------- Retry / DLQ helpers ----------------
  private async sendChunkWithRetries(chunk: string[], base: any, chunkIndex: number) {
    // Attempts with exponential backoff for retryable errors
    let lastError: any = null;
    for (
      let attempt = 0;
      attempt < Number(process.env.FCM_RETRY_ATTEMPTS ?? FcmConstants.RETRY_ATTEMPTS);
      attempt++
    ) {
      try {
        const res = await this.messaging.sendEachForMulticast({ ...base, tokens: chunk });
        return res;
      } catch (e: any) {
        lastError = e;
        const codeOrMsg = String(e?.code || e?.message || '');
        const isRetryable = /TooManyRequests|quota|429|5\d{2}/i.test(codeOrMsg);
        this.logger.warn(`Chunk ${chunkIndex + 1} thử lần ${attempt + 1} thất bại`, {
          error: codeOrMsg,
          isRetryable,
        });
        if (!isRetryable) {
          // Non-retryable: break and move to DLQ
          break;
        }
        // exponential backoff with jitter
        const baseMs = Number(
          process.env.FCM_RETRY_BACKOFF_BASE_MS ?? FcmConstants.RETRY_BACKOFF_MS,
        );
        const jitter = Number(
          process.env.FCM_RETRY_BACKOFF_JITTER_MS ?? FcmConstants.RETRY_BACKOFF_JITTER_MS,
        );
        const backoffMs = Math.min(
          Number(process.env.FCM_RETRY_BACKOFF_MAX_MS ?? FcmConstants.RETRY_BACKOFF_MS * 8),
          baseMs * Math.pow(2, attempt) + Math.random() * jitter,
        );
        this.logger.debug(`Chunk ${chunkIndex + 1} sẽ thử lại sau ${backoffMs}ms`);

        await FcmUtils.sleep(backoffMs);
      }
    }

    // After attempts exhausted or non-retryable error: enqueue for background retry/DLQ
    try {
      this.enqueueRetryQueue({ tokens: chunk, payload: base, opts: undefined, attempts: 0 });
      if (this._monitoringService && typeof this._monitoringService.reportMetric === 'function') {
        await this._monitoringService
          .reportMetric('fcm.chunk_enqueued_for_retry', 1, {
            chunkSize: String(chunk.length),
          })
          .catch(() => {});
      }
    } catch {
      // fall through
    }

    // Return a synthetic failure response so caller can continue
    const synthetic = {
      successCount: 0,
      failureCount: chunk.length,
      responses: chunk.map((t: string, i: number) => ({
        index: i,
        success: false,
        error: lastError,
      })) as any,
    };
    return synthetic;
  }

  private enqueueRetryQueue(item: {
    tokens: string[];
    payload: FcmNotificationPayload | any;
    opts?: FcmSendOptions;
    attempts: number;
  }) {
    // Try to use the durable queue adapter if available; otherwise fallback to in-memory
    (async () => {
      try {
        const adapter = await import('../../../infrastructure/queue/fcm.queue');
        if (adapter && typeof adapter.enqueueFcmRetry === 'function') {
          await adapter.enqueueFcmRetry(item.tokens, item.payload, item.opts);
          return;
        }
      } catch {
        // ignore dynamic import errors and fallback
      }

      // fallback: in-memory queue
      this.retryQueue.push({
        tokens: item.tokens,
        payload: item.payload,
        opts: item.opts,
        attempts: item.attempts,
      });
      // ensure worker running
      this.startRetryWorker();
    })();
  }

  private enqueueDlq(item: {
    tokens: string[];
    payload: FcmNotificationPayload | any;
    opts?: FcmSendOptions;
    attempts: number;
    lastError?: any;
  }) {
    this.dlq.push(item);
    if (this._monitoringService && typeof this._monitoringService.reportMetric === 'function') {
      // best-effort, don't await to keep this function synchronous
      try {
        this._monitoringService
          .reportMetric('fcm.chunk_moved_to_dlq', 1, { chunkSize: String(item.tokens.length) })
          .catch(() => {});
      } catch {
        /* swallow */
      }
    }
    // persist DLQ to disk as a simple durable placeholder
    (async () => {
      try {
        const path = process.env.FCM_DLQ_PATH ?? './fcm_dlq.json';
        let existing: any[] = [];
        try {
          const raw = await fs.readFile(path, 'utf8');
          existing = JSON.parse(raw || '[]');
        } catch {
          existing = [];
        }
        existing.push({
          tokens: item.tokens,
          attempts: item.attempts,
          lastError: item.lastError,
          timestamp: new Date().toISOString(),
        });
        await fs.writeFile(path, JSON.stringify(existing, null, 2), 'utf8');
      } catch {
        // swallow file errors; DLQ persistence is best-effort
      }
    })();
  }

  private startRetryWorker() {
    if (this.retryWorkerTimer) return; // already running
    const worker = async () => {
      await this.processRetryQueue();
      // schedule next run
      this.retryWorkerTimer = setTimeout(
        worker,
        Number(process.env.FCM_RETRY_WORKER_INTERVAL_MS ?? 5000),
      );
    };
    this.retryWorkerTimer = setTimeout(worker, 1000);
  }

  private async processRetryQueue() {
    if (!this.messaging) return;
    if (!this.retryQueue.length) return;
    // process up to batchSize items each run to avoid long blocking
    const batchSize = Number(process.env.FCM_RETRY_WORKER_BATCH_SIZE ?? 5);
    const items: typeof this.retryQueue = [] as any;
    for (let i = 0; i < batchSize && this.retryQueue.length > 0; i++) {
      const it = this.retryQueue.shift();
      if (it) items.push(it);
    }

    await Promise.all(
      items.map(async (item) => {
        try {
          const res = await this.messaging.sendEachForMulticast({
            ...item.payload,
            tokens: item.tokens,
          });
          const successCount = res?.successCount ?? 0;
          if (successCount === 0) {
            item.attempts += 1;
            const attemptsAllowed = Number(
              process.env.FCM_RETRY_ATTEMPTS ?? FcmConstants.RETRY_ATTEMPTS,
            );
            if (item.attempts >= attemptsAllowed) {
              this.enqueueDlq({ ...item, lastError: 'exhausted' });
            } else {
              this.retryQueue.push(item);
            }
          }
        } catch (err) {
          item.attempts += 1;
          const attemptsAllowed = Number(
            process.env.FCM_RETRY_ATTEMPTS ?? FcmConstants.RETRY_ATTEMPTS,
          );
          if (item.attempts >= attemptsAllowed) {
            this.enqueueDlq({ ...item, lastError: err });
          } else {
            this.retryQueue.push(item);
          }
        }
      }),
    );
  }

  /**
   * Get tokens for a specific device
   */
  async getDeviceTokens(userId: string, deviceId: string): Promise<string[]> {
    return this._fcmTokenRepo.findTokensByDevice(userId, deviceId);
  }

  /**
   * Get tokens for all devices except specified device
   */
  async getTokensExcludingDevice(userId: string, excludeDeviceId: string): Promise<string[]> {
    return this._fcmTokenRepo.findTokensExcludingDevice(userId, excludeDeviceId);
  }
}
