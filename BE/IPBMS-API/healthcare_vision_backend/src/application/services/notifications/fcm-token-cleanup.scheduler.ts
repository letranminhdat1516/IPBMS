import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FcmTokenRepository } from '../../../infrastructure/repositories/notifications/fcm-token.repository';

@Injectable()
export class FcmTokenCleanupScheduler {
  private readonly logger = new Logger(FcmTokenCleanupScheduler.name);

  constructor(private readonly _fcmTokenRepository: FcmTokenRepository) {}

  /**
   * Chạy mỗi ngày lúc 2:00 AM để dọn dẹp các token không hoạt động
   * - Xóa token không sử dụng trong 30 ngày
   * - Deactivate token không sử dụng trong 7 ngày
   */
  @Cron('0 2 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async cleanupInactiveTokens() {
    this.logger.log('🧹 [CRON] Bắt đầu dọn dẹp FCM tokens không hoạt động...');

    try {
      // 1. Xóa token không sử dụng trong 30 ngày
      const deletedCount = await this._fcmTokenRepository.deleteOldInactiveTokens(30);
      this.logger.log(`🗑️ Đã xóa ${deletedCount} token cũ (không sử dụng > 30 ngày)`);

      // 2. Deactivate token không sử dụng trong 7 ngày
      const deactivatedCount = await this._fcmTokenRepository.deactivateOldTokens(7);
      this.logger.log(`🚫 Đã deactivate ${deactivatedCount} token không hoạt động (> 7 ngày)`);

      // 3. Thống kê tổng quan
      const totalActive = await this._fcmTokenRepository.countActiveTokens();
      const totalInactive = await this._fcmTokenRepository.countInactiveTokens();

      this.logger.log(`📊 Thống kê FCM tokens: ${totalActive} active, ${totalInactive} inactive`);
    } catch (error) {
      this.logger.error(
        `❌ Lỗi khi dọn dẹp FCM tokens: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }

    this.logger.log('✅ [CRON] Hoàn thành dọn dẹp FCM tokens');
  }

  /**
   * Chạy mỗi tuần (thứ 2 lúc 3:00 AM) để dọn dẹp sâu hơn
   * - Xóa tất cả token inactive cũ hơn 60 ngày
   * - Log chi tiết về token có vấn đề
   */
  @Cron('0 3 * * 1', { timeZone: 'Asia/Ho_Chi_Minh' })
  async deepCleanupTokens() {
    this.logger.log('🔍 [CRON] Bắt đầu dọn dẹp sâu FCM tokens...');

    try {
      // Xóa tất cả token inactive cũ hơn 60 ngày
      const deepDeletedCount = await this._fcmTokenRepository.deleteOldInactiveTokens(60);
      this.logger.log(
        `🗑️ Deep cleanup: Đã xóa ${deepDeletedCount} token rất cũ (inactive > 60 ngày)`,
      );

      // Thống kê theo platform
      const platformStats = await this._fcmTokenRepository.getPlatformStats();
      this.logger.log('📱 Thống kê theo platform:', platformStats);
    } catch (error) {
      this.logger.error(
        `❌ Lỗi khi deep cleanup FCM tokens: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }

    this.logger.log('✅ [CRON] Hoàn thành deep cleanup FCM tokens');
  }
}
