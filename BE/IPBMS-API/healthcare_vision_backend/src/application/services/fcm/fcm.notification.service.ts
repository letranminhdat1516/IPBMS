import { Injectable, Logger, Optional } from '@nestjs/common';
import { ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import {
  FcmConstants,
  FcmNotificationPayload,
  FcmSendOptions,
} from '../../../core/types/fcm.types';
import { MonitoringService } from '../../../shared/services/monitoring.service';
import { ActivityLogsService } from '../activity-logs.service';
import { NotificationPreferencesService } from '../notification-preferences.service';
import { FcmCoreService } from './fcm.core.service';
import { FcmUtils } from './fcm.utils';

@Injectable()
export class FcmNotificationService {
  private readonly logger = new Logger(FcmNotificationService.name);
  constructor(
    private readonly _fcmCoreService: FcmCoreService,
    private readonly _activityLogsService: ActivityLogsService,
    @Optional() private readonly _notificationPreferencesService?: NotificationPreferencesService,
    @Optional() private readonly _monitoringService?: MonitoringService,
  ) {}

  // ---------------- Luồng gửi thông báo (Push flows) ----------------
  /** (1) Thông báo hệ thống: Sự kiện AI → Khách hàng + Caregivers */
  async pushSystemEvent(
    customerId: string,
    input: {
      eventId: string;
      eventType: string;
      title?: string;
      body?: string;
      deeplink?: string;
      extra?: Record<string, string>;
    },
  ) {
    this.logger.debug(
      `[pushSystemEvent] start for customer ${customerId}, event: ${input.eventType}`,
    );

    // 1) Xác định recipients: khách hàng + các caregiver của họ
    this.logger.debug(`[pushSystemEvent] finding caregiver IDs for customer ${customerId}`);
    const caregiverIds = await this._fcmCoreService.getCaregiverUserIdsForCustomer(customerId);
    const allUserIds = [customerId, ...caregiverIds];
    this.logger.debug(`[pushSystemEvent] total recipients: ${allUserIds.length}`);

    // 2) Lọc recipients dựa trên notification preferences và event type
    this.logger.debug(`[pushSystemEvent] filtering recipients by preferences`);
    const filteredUserIds = [];
    for (const userId of allUserIds) {
      const shouldSendSystem = this._notificationPreferencesService
        ? await this._notificationPreferencesService.shouldSendNotification(userId, 'system')
        : true;
      const shouldSendEventType = this._notificationPreferencesService
        ? await this._notificationPreferencesService.shouldSendEventType(userId, input.eventType)
        : true;

      if (shouldSendSystem && shouldSendEventType) {
        filteredUserIds.push(userId);
      }
    }

    this.logger.debug(
      `[pushSystemEvent] after filtering: ${filteredUserIds.length}/${allUserIds.length}`,
    );

    // Nếu không có user nào muốn nhận notification, return early
    if (filteredUserIds.length === 0) {
      this.logger.debug(`[pushSystemEvent] no recipients after filtering, exiting early`);
      return { successCount: 0, failureCount: 0, responses: [], noTokenRecipients: allUserIds };
    }

    // 3) Query tokens once and group by recipient user
    this.logger.debug('[FcmNotificationService] calling getAudienceTokensGroupedByUser', {
      userIds: filteredUserIds,
    });

    const { tokens, map: tokensMap } =
      await this._fcmCoreService.getAudienceTokensGroupedByUser(filteredUserIds);

    this.logger.debug(
      `[pushSystemEvent] found ${tokens.length} tokens for ${Object.keys(tokensMap).length} users`,
    );

    const title = input.title ?? 'Cảnh báo an toàn';
    const body = input.body ?? FcmUtils.humanizeEvent(input.eventType);
    const data: Record<string, string> = {
      type: 'system_event',
      eventId: input.eventId,
      eventType: input.eventType,
      customerId: customerId,
      timestamp: new Date().toISOString(),
      deeplink: input.deeplink ?? `detectcare://event/${input.eventId}`,
      // Thêm thông tin bổ sung từ extra nếu có
      ...(input.extra ?? {}),
    };

    this.logger.debug('[pushSystemEvent] FCM data payload', { data });

    // 5) Gửi và trả về kết quả cùng danh sách users không có token
    const { successCount, failureCount, responses } = await this._fcmCoreService.sendMulticast(
      tokens,
      { notification: { title, body }, data },
      { collapseKey: `sys-${customerId}`, ttlSeconds: 120 },
    );

    const noTokenRecipients = filteredUserIds.filter((uid) => !tokensMap[uid]?.length);

    this.logger.debug(
      `[pushSystemEvent] completed multicast: ${successCount} success, ${failureCount} failure`,
    );

    // INFO log để dễ theo dõi: báo số caregiver nhận được (sau filter), tổng recipients, và số token
    try {
      const caregiverRecipients = filteredUserIds.filter((id) => id !== customerId).length;
      this.logger.log(
        `[pushSystemEvent] Hệ thống gửi FCM đến ${caregiverRecipients} caregiver(s) và customer ${customerId} — recipients=${filteredUserIds.length}, tokens=${tokens.length}, success=${successCount}, failure=${failureCount}, noTokenRecipients=${noTokenRecipients.length}`,
      );
    } catch {
      // không quan trọng nếu log không thành công
    }

    return { successCount, failureCount, responses, noTokenRecipients };
  }

  /** (2) Actor-to-Actor: Customer ↔ Caregiver (gửi tin nhắn giữa các actor) */
  async pushActorMessage(params: {
    fromUserId: string;
    toUserIds: string[];
    direction: 'customer_to_caregiver' | 'caregiver_to_customer';
    category: 'help' | 'reminder' | 'report' | 'confirm';
    message: string;
    deeplink?: string;
    extra?: Record<string, string>;
    fromToken?: string;
  }) {
    this.logger.debug('[pushActorMessage] called', {
      fromUserId: params.fromUserId,
      toUserIds: params.toUserIds,
      direction: params.direction,
      category: params.category,
      messagePreview: params.message.substring(0, 50) + '...',
    });

    // 1) Lọc recipients dựa trên notification preferences
    const filteredUserIds = [];
    for (const userId of params.toUserIds) {
      const shouldSendActor = this._notificationPreferencesService
        ? await this._notificationPreferencesService.shouldSendNotification(userId, 'actor')
        : true;
      if (shouldSendActor) {
        filteredUserIds.push(userId);
      }
    }

    this.logger.debug('[pushActorMessage] after filtering preferences', {
      originalCount: params.toUserIds.length,
      filteredCount: filteredUserIds.length,
      filteredUserIds,
    });

    // Nếu không có user nào muốn nhận notification, return early
    if (filteredUserIds.length === 0) {
      this.logger.debug('[FcmNotificationService] No users want notifications, returning early');
      return {
        successCount: 0,
        failureCount: 0,
        responses: [],
        tokensMap: {},
        noTokenRecipients: params.toUserIds,
      };
    }

    // 2) Get tokens for the specific recipient users (no audience filtering needed)
    this.logger.debug('[pushActorMessage] getting tokens for recipients', {
      direction: params.direction,
      recipientCount: filteredUserIds.length,
      recipients: filteredUserIds,
    });

    const { tokens, map: tokensMap } =
      await this._fcmCoreService.getAudienceTokensGroupedByUser(filteredUserIds);

    this.logger.debug('[pushActorMessage] token query result', {
      totalTokens: tokens.length,
      tokensMapKeys: Object.keys(tokensMap),
    });

    // 4) Xây payload notification / data
    const title =
      params.direction === 'customer_to_caregiver' ? 'Yêu cầu hỗ trợ' : 'Tin nhắn từ Caregiver';
    const body = params.message;
    const data: Record<string, string> = {
      type: 'actor_message',
      direction: params.direction,
      category: params.category,
      fromUserId: params.fromUserId,
      toUserIds: params.toUserIds.join(','),
      message: params.message,
      timestamp: new Date().toISOString(),
      notificationId: `msg_${params.fromUserId}_${Date.now()}`,
      priority: params.category === 'help' ? 'high' : 'normal',
      recipientCount: params.toUserIds.length.toString(),
      deeplink:
        params.deeplink ?? `detectcare://chat?from=${encodeURIComponent(params.fromUserId)}`,
      ...(params.extra ?? {}),
    };

    this.logger.debug('[pushActorMessage] FCM data payload', { data });

    // 5) Nếu sender gửi token thiết bị (fromToken), loại token đó khỏi recipients
    //    để thiết bị gửi không nhận lại notification của chính nó.
    if (params.fromToken) {
      const ft = params.fromToken;
      const originalTokenCount = tokens.length;
      // remove from the flat token list
      const idx = tokens.indexOf(ft);
      if (idx !== -1) tokens.splice(idx, 1);
      // also remove from per-user token map
      for (const k of Object.keys(tokensMap)) {
        tokensMap[k] = (tokensMap[k] || []).filter((t) => t !== ft);
      }

      this.logger.debug('[pushActorMessage] excluded sender token from recipients', {
        fromTokenPresent: true,
        tokensRemoved: originalTokenCount - tokens.length,
        remainingTokens: tokens.length,
      });
    } else {
      this.logger.debug('[pushActorMessage] no sender token to exclude');
    }

    // 6) Tính lại danh sách recipients thiếu token để trả về cho caller (sau khi exclude)
    const noTokenRecipients = filteredUserIds.filter((uid: string) => !tokensMap[uid]?.length);

    this.logger.debug('[pushActorMessage] preparing to send multicast', {
      finalTokenCount: tokens.length,
      recipientsWithTokens: filteredUserIds.length - noTokenRecipients.length,
      noTokenRecipients: noTokenRecipients.length,
      collapseKey: `msg-${params.direction}-${params.fromUserId}`,
      ttlSeconds: FcmConstants.DEFAULT_TTL_SECONDS,
    });

    // 6) Gửi multicast. Dùng collapseKey có fromUserId để tránh collapse message từ các sender khác nhau.
    const res = await this._fcmCoreService.sendMulticast(
      tokens,
      { notification: { title, body }, data },
      { collapseKey: `actor-${params.fromUserId}`, ttlSeconds: 120 },
    );

    this.logger.debug('[pushActorMessage] multicast result', {
      successCount: res.successCount,
      failureCount: res.failureCount,
      totalProcessed: res.successCount + res.failureCount,
      successRate:
        tokens.length > 0 ? ((res.successCount / tokens.length) * 100).toFixed(1) + '%' : '0%',
    });

    // Log the FCM message
    try {
      await this._activityLogsService.create({
        actor_id: params.fromUserId,
        action: 'send_fcm_message',
        resource_type: 'fcm_message',
        message: `FCM message sent: ${params.message}`,
        severity: ActivitySeverity.INFO,
        meta: {
          direction: params.direction,
          category: params.category,
          toUserIds: params.toUserIds,
          filteredUserIds,
          successCount: res.successCount,
          failureCount: res.failureCount,
          noTokenRecipients,
          deeplink: params.deeplink,
        },
      });
    } catch (logError) {
      this.logger.warn('Failed to log FCM message:', logError);
    }

    // 7) Trả về kết quả gửi kèm token map và danh sách recipients thiếu token
    return { ...res, tokensMap, noTokenRecipients };
  }

  /** Convenience wrapper used by consumers (e.g. NotificationsService) via injected FcmService */
  async sendNotificationToUser(
    userId: string,
    title: string,
    body?: string,
    data?: Record<string, string>,
  ) {
    this.logger.debug(`[sendNotificationToUser] Bắt đầu cho user ${userId}, tiêu đề: "${title}"`);

    // Lấy tất cả token đang hoạt động cho user (bất kỳ audience nào)
    this.logger.debug(`[sendNotificationToUser] truy vấn token cho user ${userId}`);
    const toks = await this._fcmCoreService.getAudienceTokensByUserIds([userId]);

    if (!toks?.length) {
      this.logger.debug(`[sendNotificationToUser] không có token cho user ${userId}, bỏ qua gửi`);
      try {
        if (this._monitoringService && typeof this._monitoringService.reportMetric === 'function') {
          await this._monitoringService.reportMetric('notifications.skipped_no_tokens', 1, {
            userId,
          });
        }
      } catch {
        // ignore monitoring errors
      }
      return { successCount: 0, failureCount: 0, responses: [] };
    }

    this.logger.debug(
      `[sendNotificationToUser] tìm thấy ${toks.length} token, chuẩn bị gửi multicast`,
    );
    const enhancedData = {
      timestamp: new Date().toISOString(),
      userId: userId,
      ...(data ?? {}),
    };
    const finalTitle = title ?? 'Thông báo';
    const finalBody = body ?? 'Bạn có thông báo mới';
    // Debug: log constructed payload so we can confirm whether the `notification`
    // object is present at runtime (helps debugging Android background behavior).
    try {
      this.logger.debug('[sendNotificationToUser] constructed FCM payload', {
        userId,
        notification: { title: finalTitle, body: finalBody },
        data: enhancedData,
        tokenCount: toks.length,
      });
    } catch (logErr) {
      // swallow logging errors
      this.logger.warn('Failed to log FCM payload debug info', logErr);
    }

    const result = await this._fcmCoreService.sendMulticast(toks, {
      notification: { title: finalTitle, body: finalBody },
      data: enhancedData,
    });

    this.logger.debug(
      `[sendNotificationToUser] Hoàn thành cho user ${userId}: ${result.successCount} thành công, ${result.failureCount} thất bại`,
    );
    try {
      if (this._monitoringService && typeof this._monitoringService.reportMetric === 'function') {
        await this._monitoringService.reportMetric('notifications.sent', result.successCount, {
          userId,
        });
        await this._monitoringService.reportMetric('notifications.failed', result.failureCount, {
          userId,
        });
      }
    } catch {
      // ignore monitoring errors
    }

    // Log delivery result
    try {
      await this._activityLogsService.create({
        actor_id: userId,
        action: 'fcm_delivery_result',
        resource_type: 'fcm_notification',
        resource_id: userId,
        message: `FCM notification delivery: ${result.successCount} success, ${result.failureCount} failure`,
        severity: result.failureCount > 0 ? ActivitySeverity.MEDIUM : ActivitySeverity.INFO,
        meta: {
          title,
          body,
          data: enhancedData,
          successCount: result.successCount,
          failureCount: result.failureCount,
          totalTokens: toks.length,
          deliveryRate:
            toks.length > 0 ? ((result.successCount / toks.length) * 100).toFixed(1) + '%' : '0%',
        },
      });
    } catch (logError) {
      this.logger.warn('Không thể ghi log kết quả gửi FCM:', logError);
    }

    return result;
  }

  /**
   * Send notification to a specific device only
   */
  async sendNotificationToDevice(
    userId: string,
    deviceId: string,
    title: string,
    body?: string,
    data?: Record<string, string>,
  ) {
    this.logger.debug(
      `[sendNotificationToDevice] start for device ${deviceId} of user ${userId}, title: "${title}"`,
    );

    // Get tokens for specific device only
    this.logger.debug(
      `[sendNotificationToDevice] querying tokens for device ${deviceId} of user ${userId}`,
    );
    const tokenStrings = await this._fcmCoreService.getDeviceTokens(userId, deviceId);

    if (!tokenStrings?.length) {
      this.logger.debug(
        `[sendNotificationToDevice] no tokens for device ${deviceId} of user ${userId}, skipping`,
      );
      return { successCount: 0, failureCount: 0, responses: [] };
    }

    this.logger.debug(
      `[sendNotificationToDevice] found ${tokenStrings.length} tokens for device ${deviceId}, sending multicast`,
    );
    const result = await this._fcmCoreService.sendMulticast(tokenStrings, {
      notification: { title, body: body ?? '' },
      data: data ?? {},
    });

    this.logger.debug(
      `[sendNotificationToDevice] completed for device ${deviceId}: ${result.successCount} success, ${result.failureCount} failure`,
    );
    return result;
  }

  /**
   * Broadcast notification to all devices except the sender device
   */
  async broadcastToOtherDevices(
    userId: string,
    excludeDeviceId: string,
    title: string,
    body?: string,
    data?: Record<string, string>,
  ) {
    this.logger.debug(
      `[broadcastToOtherDevices] start for user ${userId}, excluding device ${excludeDeviceId}`,
    );

    // Get tokens for all devices except the sender
    this.logger.debug(
      `[broadcastToOtherDevices] querying tokens excluding device ${excludeDeviceId}`,
    );
    const tokenStrings = await this._fcmCoreService.getTokensExcludingDevice(
      userId,
      excludeDeviceId,
    );

    if (!tokenStrings?.length) {
      this.logger.debug(`[broadcastToOtherDevices] no other devices for user ${userId}, skipping`);
      return { successCount: 0, failureCount: 0, responses: [] };
    }

    this.logger.debug(
      `[broadcastToOtherDevices] found ${tokenStrings.length} tokens for broadcast, sending`,
    );
    const result = await this._fcmCoreService.sendMulticast(tokenStrings, {
      notification: { title, body: body ?? '' },
      data: data ?? {},
    });

    this.logger.debug(
      `[broadcastToOtherDevices] completed for user ${userId}: ${result.successCount} success, ${result.failureCount} failure`,
    );
    return result;
  }
}
