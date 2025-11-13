import { getMessaging } from 'firebase-admin/messaging';
import { FcmNotificationPayload, FcmSendOptions } from '../../core/types/fcm.types';

/**
 * Service for sending FCM notifications
 */
export class FcmService {
  private messaging = getMessaging();

  /**
   * Send FCM notification to a single device token
   */
  async sendToDevice(token: string, payload: FcmNotificationPayload, options?: FcmSendOptions) {
    try {
      const message = {
        token,
        ...payload,
        ...options,
      };

      const response = await this.messaging.send(message);
      return {
        success: true,
        messageId: response,
        token,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        token,
      };
    }
  }

  /**
   * Send FCM notification to multiple tokens
   */
  async sendToMultipleTokens(
    tokens: string[],
    payload: FcmNotificationPayload,
    options?: FcmSendOptions,
  ) {
    try {
      const message = {
        tokens,
        ...payload,
        ...options,
      };

      const response = await this.messaging.sendEachForMulticast(message);
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses,
      };
    } catch (error) {
      throw new Error(`Failed to send multicast message: ${(error as Error).message}`);
    }
  }

  /**
   * Send FCM notification to a topic
   */
  async sendToTopic(topic: string, payload: FcmNotificationPayload, options?: FcmSendOptions) {
    try {
      const message = {
        topic,
        ...payload,
        ...options,
      };

      const response = await this.messaging.send(message);
      return {
        success: true,
        messageId: response,
        topic,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        topic,
      };
    }
  }
}

// Usage example
export const createEmergencyNotification = (): FcmNotificationPayload => {
  return {
    notification: {
      title: '🚨 CẢNH BÁO KHẨN CẤP',
      body: 'Đã phát hiện sự cố ở khu vực giám sát. Vui lòng kiểm tra ngay!',
      imageUrl: 'https://example.com/emergency-icon.png',
    },
    data: {
      eventId: 'evt_123456',
      eventType: 'emergency',
      priority: 'high',
      timestamp: new Date().toISOString(),
      actionUrl: '/emergency/evt_123456',
    },
    android: {
      priority: 'high',
      ttl: 3600000, // 1 hour
      notification: {
        channelId: 'emergency_channel',
        priority: 'high',
        defaultSound: true,
        defaultVibrateTimings: true,
        defaultLightSettings: true,
        visibility: 'public',
        notificationCount: 1,
        color: '#FF0000',
      },
    },
    apns: {
      headers: {
        'apns-priority': '10',
        'apns-expiration': '1609459200',
      },
      payload: {
        aps: {
          alert: {
            title: '🚨 CẢNH BÁO KHẨN CẤP',
            body: 'Đã phát hiện sự cố ở khu vực giám sát. Vui lòng kiểm tra ngay!',
          },
          badge: 1,
          sound: 'emergency.caf',
          contentAvailable: true,
          mutableContent: true,
          category: 'EMERGENCY',
        },
        customData: {
          eventId: 'evt_123456',
          eventType: 'emergency',
        },
      },
    },
    webpush: {
      headers: {
        TTL: '3600',
        Urgency: 'high',
      },
      notification: {
        title: '🚨 CẢNH BÁO KHẨN CẤP',
        body: 'Đã phát hiện sự cố ở khu vực giám sát. Vui lòng kiểm tra ngay!',
        icon: 'https://example.com/emergency-icon.png',
        badge: 'https://example.com/badge.png',
        image: 'https://example.com/emergency-image.jpg',
        requireInteraction: true,
        silent: false,
        actions: [
          {
            action: 'view_event',
            title: 'Xem chi tiết',
            icon: 'https://example.com/view-icon.png',
          },
          {
            action: 'dismiss',
            title: 'Bỏ qua',
          },
        ],
        data: {
          eventId: 'evt_123456',
          url: '/emergency/evt_123456',
        },
      },
      data: {
        eventId: 'evt_123456',
        eventType: 'emergency',
        priority: 'high',
      },
    },
  };
};

// Example usage
export const sendEmergencyAlert = async (fcmService: FcmService, token: string) => {
  const payload = createEmergencyNotification();

  const result = await fcmService.sendToDevice(token, payload, {
    ttlSeconds: 3600,
    collapseKey: 'emergency',
  });

  return result;
};
