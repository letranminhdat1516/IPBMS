import { Injectable, Logger } from '@nestjs/common';
import { FcmNotificationService } from './fcm.notification.service';
import { FcmCoreService } from './fcm.core.service';
import { FcmNotificationPayload } from '../../../core/types/fcm.types';

@Injectable()
export class FcmBackgroundNotificationTest {
  private readonly logger = new Logger(FcmBackgroundNotificationTest.name);

  constructor(
    private readonly _fcmNotificationService: FcmNotificationService,
    private readonly _fcmCoreService: FcmCoreService,
  ) {}

  /**
   * Test gửi notification background - đảm bảo app nhận được khi ở background
   */
  async testBackgroundNotification(userId: string, deviceToken?: string) {
    this.logger.log(`[testBackgroundNotification] Bắt đầu test cho user ${userId}`);

    // 1. Tạo payload đảm bảo hiển thị khi app background
    const backgroundPayload: FcmNotificationPayload = {
      notification: {
        title: '🔔 Test Background Notification',
        body: 'Đây là test notification khi app ở background',
      },
      data: {
        type: 'background_test',
        userId: userId,
        timestamp: new Date().toISOString(),
        testId: `bg_test_${Date.now()}`,
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'alerts',
          priority: 'high',
          sound: 'default',
          vibrateTimingsMillis: [0, 250, 250, 250],
          clickAction: 'OPEN_APP',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: '🔔 Test Background Notification',
              body: 'Đây là test notification khi app ở background',
            },
            badge: 1,
            sound: 'default',
            category: 'BACKGROUND_TEST',
          },
        },
        headers: {
          'apns-priority': '10', // Immediate delivery
          'apns-push-type': 'alert',
        },
      },
      webpush: {
        headers: {
          TTL: '3600',
          Urgency: 'high',
        },
        notification: {
          actions: [
            {
              action: 'open',
              title: 'Mở app',
            },
          ],
        },
      },
    };

    try {
      let result;

      if (deviceToken) {
        // Test gửi đến token cụ thể
        this.logger.log(
          `[testBackgroundNotification] Gửi đến token cụ thể: ${deviceToken.substring(0, 20)}...`,
        );
        result = await this._fcmCoreService.sendMulticast([deviceToken], backgroundPayload, {
          collapseKey: 'background_test',
          ttlSeconds: 3600,
        });
      } else {
        // Test gửi đến tất cả devices của user
        this.logger.log(`[testBackgroundNotification] Gửi đến tất cả devices của user ${userId}`);
        const tokens = await this._fcmCoreService.getAudienceTokensByUserIds([userId]);
        if (tokens.length === 0) {
          this.logger.warn(
            `[testBackgroundNotification] Không tìm thấy token nào cho user ${userId}`,
          );
          return { success: false, error: 'No tokens found for user' };
        }

        result = await this._fcmCoreService.sendMulticast(tokens, backgroundPayload, {
          collapseKey: 'background_test',
          ttlSeconds: 3600,
        });
      }

      this.logger.log(`[testBackgroundNotification] Kết quả gửi:`, {
        successCount: result.successCount,
        failureCount: result.failureCount,
        totalTokens: result.successCount + result.failureCount,
      });

      // Log chi tiết failures nếu có
      if (result.failureCount > 0 && result.responses) {
        const failures = result.responses.filter((r: any) => !r.success);
        this.logger.warn(`[testBackgroundNotification] Chi tiết failures:`, failures);
      }

      return {
        success: result.successCount > 0,
        successCount: result.successCount,
        failureCount: result.failureCount,
        totalTokens: result.successCount + result.failureCount,
        testId: backgroundPayload.data?.testId,
      };
    } catch (error) {
      this.logger.error(`[testBackgroundNotification] Lỗi:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        testId: backgroundPayload.data?.testId,
      };
    }
  }

  /**
   * Test gửi emergency notification background
   */
  async testEmergencyBackgroundNotification(userId: string) {
    this.logger.log(`[testEmergencyBackgroundNotification] Test emergency cho user ${userId}`);

    const emergencyPayload: FcmNotificationPayload = {
      notification: {
        title: '🚨 CẢNH BÁO KHẨN CẤP - TEST',
        body: 'Test emergency notification khi app background',
      },
      data: {
        type: 'emergency_test',
        userId: userId,
        timestamp: new Date().toISOString(),
        priority: 'critical',
        testId: `emergency_bg_test_${Date.now()}`,
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'emergency',
          priority: 'max',
          sound: 'emergency',
          clickAction: 'OPEN_EMERGENCY',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: '🚨 CẢNH BÁO KHẨN CẤP - TEST',
              body: 'Test emergency notification khi app background',
            },
            badge: 1,
            sound: {
              critical: true,
              name: 'emergency.caf',
              volume: 1.0,
            },
            category: 'EMERGENCY_TEST',
            'thread-id': 'emergency',
          },
        },
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
          'apns-expiration': String(Math.floor(Date.now() / 1000) + 300), // 5 minutes
        },
      },
      webpush: {
        headers: {
          TTL: '300', // 5 minutes for emergency
          Urgency: 'high',
        },
        notification: {
          actions: [
            {
              action: 'respond',
              title: 'Phản hồi ngay',
            },
            {
              action: 'dismiss',
              title: 'Bỏ qua',
            },
          ],
          requireInteraction: true,
          silent: false,
        },
      },
    };

    try {
      const tokens = await this._fcmCoreService.getAudienceTokensByUserIds([userId]);
      if (tokens.length === 0) {
        this.logger.warn(
          `[testEmergencyBackgroundNotification] Không tìm thấy token nào cho user ${userId}`,
        );
        return { success: false, error: 'No tokens found for user' };
      }

      const result = await this._fcmCoreService.sendMulticast(tokens, emergencyPayload, {
        collapseKey: 'emergency_test',
        ttlSeconds: 300, // 5 minutes for emergency
      });

      this.logger.log(`[testEmergencyBackgroundNotification] Kết quả gửi emergency:`, {
        successCount: result.successCount,
        failureCount: result.failureCount,
        totalTokens: result.successCount + result.failureCount,
      });

      return {
        success: result.successCount > 0,
        successCount: result.successCount,
        failureCount: result.failureCount,
        totalTokens: result.successCount + result.failureCount,
        testId: emergencyPayload.data?.testId,
        type: 'emergency_background_test',
      };
    } catch (error) {
      this.logger.error(`[testEmergencyBackgroundNotification] Lỗi:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        testId: emergencyPayload.data?.testId,
        type: 'emergency_background_test',
      };
    }
  }

  /**
   * Test data-only notification (không có notification object)
   * Để kiểm tra xem có synthesize notification cho background không
   */
  async testDataOnlyBackgroundNotification(userId: string) {
    this.logger.log(`[testDataOnlyBackgroundNotification] Test data-only cho user ${userId}`);

    const dataOnlyPayload: FcmNotificationPayload = {
      data: {
        type: 'system_event',
        eventType: 'fall',
        userId: userId,
        timestamp: new Date().toISOString(),
        testId: `data_only_bg_test_${Date.now()}`,
        message: 'Test data-only notification khi app background',
      },
    };

    try {
      const tokens = await this._fcmCoreService.getAudienceTokensByUserIds([userId]);
      if (tokens.length === 0) {
        this.logger.warn(
          `[testDataOnlyBackgroundNotification] Không tìm thấy token nào cho user ${userId}`,
        );
        return { success: false, error: 'No tokens found for user' };
      }

      const result = await this._fcmCoreService.sendMulticast(tokens, dataOnlyPayload, {
        collapseKey: 'data_only_test',
        ttlSeconds: 3600,
      });

      this.logger.log(`[testDataOnlyBackgroundNotification] Kết quả gửi data-only:`, {
        successCount: result.successCount,
        failureCount: result.failureCount,
        totalTokens: result.successCount + result.failureCount,
      });

      return {
        success: result.successCount > 0,
        successCount: result.successCount,
        failureCount: result.failureCount,
        totalTokens: result.successCount + result.failureCount,
        testId: dataOnlyPayload.data?.testId,
        type: 'data_only_background_test',
      };
    } catch (error) {
      this.logger.error(`[testDataOnlyBackgroundNotification] Lỗi:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        testId: dataOnlyPayload.data?.testId,
        type: 'data_only_background_test',
      };
    }
  }
}
