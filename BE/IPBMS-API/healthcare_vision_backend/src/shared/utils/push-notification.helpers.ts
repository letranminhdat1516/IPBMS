import { Logger } from '@nestjs/common';
import { FcmCoreService } from '../../application/services/fcm/fcm.core.service';
import { NotificationPreferencesService } from '../../application/services/notifications/notification-preferences.service';

export async function filterUsersWithPushEnabled(
  notificationPreferencesService: NotificationPreferencesService,
  userIds: string[],
  logger?: Logger,
): Promise<string[]> {
  const filtered: string[] = [];
  for (const userId of userIds) {
    try {
      const preferences = await notificationPreferencesService.getPreferences(userId, userId);
      if (preferences?.push_notifications_enabled) filtered.push(userId);
    } catch (err) {
      logger?.warn && logger.warn(`Failed to load preferences for user ${userId}`, err);
    }
  }
  return filtered;
}

export async function getTokensMapForUsers(
  fcmCoreService: FcmCoreService,
  userIds: string[],
  logger?: Logger,
): Promise<Record<string, any[]>> {
  try {
    const { map } = await fcmCoreService.getAudienceTokensGroupedByUser(userIds);
    return map || {};
  } catch (err) {
    logger?.warn && logger.warn('Failed to fetch tokens map for users', err);
    return {};
  }
}

export async function processSingleSuggestion(
  s: any,
  prefsMap: Record<string, Record<string, any>>,
  tokensMap: Record<string, any[]>,
  reminderHours: number,
  now: Date,
  deps: {
    suggestionsService: any;
    notificationsService: any;
    fcmCoreService: any;
    prisma: any;
    logger?: Logger;
  },
) {
  const logger = deps.logger;
  try {
    if (!s.user_id) return;

    const muteInfo = deps.suggestionsService.isMutedForUser(s, prefsMap, now);
    if (muteInfo.muted) {
      if (logger?.debug)
        logger.debug(
          `Suggestion ${s.suggestion_id} is muted for user ${s.user_id} (pref=${muteInfo.prefKey})`,
        );
      return;
    }

    const toks = tokensMap[String(s.user_id)] ?? [];
    if (!toks.length) {
      logger?.debug &&
        logger.debug(`No tokens for user ${s.user_id}, skipping suggestion ${s.suggestion_id}`);
      return;
    }

    const title = s.type ? `Gợi ý: ${s.type}` : 'Gợi ý mới';
    const body = s.message ?? 'Bạn có một gợi ý mới. Vui lòng kiểm tra.';
    const collapseKey = `suggestion:item:${s.suggestion_id}`;
    const deeplink = `detectcare://notifications`;
    const dataPayload: Record<string, any> = {
      type: 'suggestion',
      suggestionId: s.suggestion_id,
      suggestionType: String(s.type ?? ''),
      resourceType: String(s.resource_type ?? ''),
      resourceId: String(s.resource_id ?? ''),
      deeplink,
      screen: 'notifications',
      screenParams: JSON.stringify({ highlightSuggestionId: s.suggestion_id }),
      timestamp: new Date().toISOString(),
    };

    // Create DB notification record (pending)
    let createdNotification: any = undefined;
    try {
      createdNotification = await deps.notificationsService.create({
        user_id: s.user_id,
        notification_type: 'suggestion',
        business_type: s.type ?? undefined,
        message: body,
        delivery_data: dataPayload,
        status: 'pending',
        priority: 'normal',
      });
      if (createdNotification?.notification_id) {
        dataPayload.notificationId = createdNotification.notification_id;
      }
    } catch (err) {
      logger?.warn && logger.warn('Failed to create DB notification record for suggestion', err);
    }

    const multicastResult = await deps.fcmCoreService.sendMulticast(
      toks,
      {
        notification: { title, body },
        data: dataPayload,
        apns: { payload: { aps: { sound: 'default', badge: 1 }, deeplink } },
      },
      { collapseKey },
    );

    // Update DB notification status
    try {
      if (createdNotification?.notification_id) {
        await deps.notificationsService.update(createdNotification.notification_id, {
          status: multicastResult && multicastResult.successCount > 0 ? 'sent' : 'failed',
          sent_at: multicastResult && multicastResult.successCount > 0 ? now : undefined,
          delivered_at:
            multicastResult && multicastResult.successCount > 0 ? new Date() : undefined,
          delivery_data: {
            ...(createdNotification.delivery_data || {}),
            fcmResult: multicastResult,
          },
          error_message:
            multicastResult && multicastResult.failureCount > 0 ? 'Some tokens failed' : undefined,
        });
      }
    } catch (err) {
      if (logger?.warn) logger.warn('Failed to update DB notification after FCM send', err);
    }

    // compute next notify
    try {
      const computedNext = await deps.suggestionsService.computeNextNotifyAt(s);
      await deps.prisma.suggestions.update({
        where: { suggestion_id: s.suggestion_id },
        data: { last_notified_at: now, next_notify_at: computedNext },
      });
    } catch (error) {
      if (logger?.warn)
        logger.warn('Failed to compute next notify via SuggestionsService, falling back', error);
      const next = new Date(Date.now() + reminderHours * 60 * 60 * 1000);
      await deps.prisma.suggestions.update({
        where: { suggestion_id: s.suggestion_id },
        data: { last_notified_at: now, next_notify_at: next },
      });
    }
    if (logger?.log) logger.log(`Sent suggestion ${s.suggestion_id} to user ${s.user_id}`);
  } catch (err) {
    if (logger?.warn) logger.warn('Failed to process suggestion notify', err);
  }
}
