import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventConfirmationService } from '../../application/services/event-confirmation.service';
import { EventAuditLogService } from '../../application/services/events/event-audit-log.service';
import { PrismaService } from '../database/prisma.service';

/**
/**
 * Cron job to automatically approve or reject event proposals that have expired (pending_until <= now()).
 *
 * MỤC ĐÍCH (Purpose):
 * - Đảm bảo các đề xuất thay đổi trạng thái sự kiện không bị treo quá lâu, tránh gây chậm trễ xử lý hoặc tồn đọng trạng thái bất thường.
 * - Tự động xử lý các đề xuất sau một khoảng thời gian nhất định (thường 48h hoặc theo cấu hình), giúp hệ thống vận hành liên tục và giảm tải cho nhân viên/caregiver.
 * - Đảm bảo các sự kiện nguy hiểm không bị tự động xác nhận nhầm (auto-reject các đề xuất chuyển sang trạng thái nguy hiểm), tránh báo động giả hoặc escalation không kiểm soát.
 * - Tự động xác nhận các đề xuất chuyển về trạng thái an toàn (auto-approve các đề xuất chuyển về normal/warning), giúp hệ thống nhanh chóng trở về trạng thái ổn định khi không có phản hồi.
 * - Đánh dấu các sự kiện bị bỏ qua (abandoned) nếu không có action nào sau thời gian quy định, phục vụ thống kê và audit.
 *
 * BUSINESS LOGIC:
 * - Auto-approve: Chỉ áp dụng cho các đề xuất chuyển trạng thái về an toàn (ví dụ: danger -> normal, warning -> normal).
 * - Auto-reject: Áp dụng cho các đề xuất chuyển trạng thái sang nguy hiểm (ví dụ: normal -> danger, normal -> warning) để tránh escalation không kiểm soát.
 * - Abandon: Đánh dấu các sự kiện không có action nào sau thời gian quy định là "bị bỏ qua" để phục vụ thống kê, audit và tối ưu workflow.
 *
 * LỢI ÍCH:
 * - Tăng tính tự động hóa, giảm tải cho nhân viên/caregiver.
 * - Đảm bảo hệ thống luôn cập nhật trạng thái sự kiện kịp thời, không bị treo.
 * - Giảm thiểu rủi ro xác nhận nhầm các sự kiện nguy hiểm.
 * - Hỗ trợ thống kê, báo cáo và audit quy trình xử lý sự kiện.
 */

@Injectable()
export class EventConfirmationAutoApproveCron {
  private readonly logger = new Logger(EventConfirmationAutoApproveCron.name);

  constructor(
    private readonly _eventConfirmationService: EventConfirmationService,
    private readonly _prismaService: PrismaService,
    private readonly _eventHistoryService: EventAuditLogService,
  ) {
    // Reference to satisfy linter
    void this._eventConfirmationService;
    void this._prismaService;
    void this._eventHistoryService;
  }

  /**
   * Auto-approve/reject expired event proposals
   * Runs every 10 minutes
   */
  @Cron(CronExpression.EVERY_10_MINUTES, {
    name: 'event-confirmation-auto-process',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleAutoProcess() {
    this.logger.log('Running auto-process for expired event proposals...');

    const lockKey = 1234567890; // arbitrary lock key; choose project-unique value
    let lockAcquired = false;

    try {
      // Try to acquire advisory lock to ensure single instance runs the job
      let gotLock: Array<{ pg_try_advisory_lock: boolean }> | null = null;
      try {
        gotLock = await this._prismaService.$queryRaw`
          SELECT pg_try_advisory_lock(${lockKey}::bigint) as pg_try_advisory_lock;
        `;
      } catch (err) {
        // Likely a transient DB error (e.g., connection closed). Log and skip this run.
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Advisory lock acquisition failed (DB error) - skipping auto-process run: ${msg}`,
        );
        return { success: false, error: `DB unavailable: ${msg}` };
      }

      if (!gotLock || gotLock[0]?.pg_try_advisory_lock !== true) {
        this.logger.debug('Another instance holds the advisory lock; skipping auto-process run');
        return { success: true, approved: 0, rejected: 0, eventIds: [] };
      }

      lockAcquired = true;

      // First, auto-reject dangerous status changes (keep as-is)
      const rejectResult = await this._eventConfirmationService.autoRejectPending(200);
      const rejectedIds = rejectResult.events.map((e) => e.event_id);

      if (rejectResult.count > 0) {
        this.logger.log(
          `🚫 Auto-rejected ${rejectResult.count} dangerous proposal(s): ${rejectedIds.join(', ')}`,
        );
      }

      // NEW: expire remaining expired proposals -> treat as rejected (no silence=consent)
      const expireResult = await this._eventConfirmationService.autoExpirePending(500);
      const expiredIds = expireResult.events ? expireResult.events.map((e) => e.event_id) : [];

      if (expireResult.count > 0) {
        this.logger.log(
          `⏰ Expired ${expireResult.count} proposal(s) (treated as rejected): ${expiredIds.join(', ')}`,
        );
      }

      // Abandoned remains for long-tail analytics only (can be adjusted)
      const abandonResult = await this._eventHistoryService.markAbandonedEvents(50);
      const abandonedIds = abandonResult.eventIds;

      if (abandonResult.count > 0) {
        this.logger.log(
          `⏰ Marked ${abandonResult.count} event(s) as abandoned (long-tail): ${abandonedIds.join(', ')}`,
        );
      }

      if (rejectResult.count === 0 && expireResult.count === 0 && abandonResult.count === 0) {
        this.logger.debug('No expired proposals to process');
      }

      return {
        success: true,
        expired: expireResult.count,
        rejected: rejectResult.count,
        abandoned: abandonResult.count,
        eventIds: [...expiredIds, ...rejectedIds, ...abandonedIds],
        ...(expireResult.errors && { expireErrors: expireResult.errors }),
        ...(rejectResult.errors && { rejectErrors: rejectResult.errors }),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to auto-process proposals: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      if (lockAcquired) {
        try {
          // Release advisory lock if held
          await this._prismaService.$queryRaw`
            SELECT pg_advisory_unlock(${lockKey}::bigint) as unlocked;
          `;
        } catch (unlockErr) {
          this.logger.warn(
            'Failed to release advisory lock for auto-process: ' + (unlockErr as any)?.message,
          );
        }
      } else {
        this.logger.debug('No advisory lock held by this instance; nothing to release');
      }
    }
  }

  /**
   * Legacy method for backward compatibility - now calls handleAutoProcess
   */
  async handleAutoApprove() {
    return this.handleAutoProcess();
  }

  /**
   * Manual trigger for testing (can be called via admin API)
   */
  async triggerManually() {
    this.logger.log('Manual trigger: Running auto-process...');
    return this.handleAutoProcess();
  }
}
