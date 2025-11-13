import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import deepEqual from '../../../shared/utils/deep-equal.util';
import { EventAuditLogRepository } from '../../../infrastructure/repositories/events/event-audit-log.repository';
import {
  EventAuditLogEntry,
  EventHistoryAction,
  EventAuditLogStats,
  EventHistoryRow,
} from '../../../core/types/event-audit-log.types';

export * from '../../../core/types/event-audit-log.types';

@Injectable()
export class EventAuditLogService {
  private readonly logger = new Logger(EventAuditLogService.name);

  constructor(
    private readonly _prisma: PrismaService,
    private readonly repo: EventAuditLogRepository,
  ) {}

  // --------------------------- READ HISTORY ---------------------------

  async getHistoryForEvent(eventId: string): Promise<EventHistoryRow[]> {
    return this.repo.getHistoryForEvent(eventId);
  }

  /**
   * Thêm trường changes/change_count để FE render diff nhanh.
   */
  expandHistoryRow(row: EventHistoryRow, options?: { limit?: number }) {
    let limit: number | undefined;
    if (options?.limit !== undefined && Number.isFinite(Number(options.limit))) {
      limit = Number(options.limit);
    }

    const changes: Array<{ field: string; path: string; old: any; new: any }> = [];
    const pushIfDiff = (field: string, oldVal: any, newVal: any) => {
      if (oldVal === undefined && newVal === undefined) return;
      try {
        if (deepEqual(oldVal, newVal)) return;
      } catch {
        if (oldVal === newVal) return;
      }
      changes.push({ field, path: field, old: oldVal, new: newVal });
    };

    pushIfDiff('status', row.previous_status, row.new_status);
    pushIfDiff('event_type', row.previous_event_type, row.new_event_type);
    pushIfDiff('confirmation_state', row.previous_confirmation_state, row.new_confirmation_state);
    // reason được ghi lại như 1 thông tin tĩnh, vẫn cho vào changes để FE hiển thị
    pushIfDiff('reason', row.reason, row.reason);

    if (row.metadata) {
      try {
        const metaOld = (row.metadata as any)?.previous ?? undefined;
        const metaNew = (row.metadata as any)?.new ?? row.metadata ?? undefined;
        if (metaOld !== undefined || metaNew !== undefined)
          pushIfDiff('metadata', metaOld, metaNew);
        else pushIfDiff('metadata', undefined, row.metadata);
      } catch {
        pushIfDiff('metadata', undefined, row.metadata);
      }
    }

    const limited = limit ? changes.slice(0, limit) : changes;
    return { ...row, change_count: limited.length, changes: limited };
  }

  // --------------------------- WRITE HISTORY ---------------------------

  async recordAuditLog(entry: EventAuditLogEntry, tx?: Prisma.TransactionClient): Promise<void> {
    return this.repo.recordAuditLog(entry, tx);
  }

  // --------------------------- LIST CHANGES (PAGINATION) ---------------------------

  /**
   * Trả về danh sách events có thay đổi (từ event_history), kèm tổng số.
   * since: mốc thời gian; page/limit: phân trang.
   * actions?: lọc theo action (VD: ['proposed','confirmed']).
   */
  async getChangedEvents(opts: {
    since?: Date | string;
    dateTo?: Date | string;
    actor_id?: string;
    page?: number;
    limit?: number;
    actions?: EventHistoryAction[];
  }): Promise<{
    items: Array<{
      event_id: string;
      user_id: string | null;
      last_change_at: Date;
      last_action: string;
      change_count: number;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    return this.repo.getChangedEvents(opts);
  }

  // --------------------------- MARK ABANDONED ---------------------------

  /**
   * Đánh dấu các event bị "bỏ quên": caregiver đề xuất thay đổi nhưng quá hạn (mặc định 48h) không có phản hồi.
   * - Tìm các event ở trạng thái CAREGIVER_UPDATED với pending_until <= now().
   * - Update sang REJECTED_BY_CUSTOMER (hoặc trạng thái bạn muốn), clear pending fields.
   * - Ghi history 'abandoned'.
   */
  async markAbandonedEvents(limit = 100): Promise<{ count: number; eventIds: string[] }> {
    const candidates = await this.repo.findAbandonedCandidates(limit);
    if (!candidates.length) return { count: 0, eventIds: [] };

    const updatedIds: string[] = [];
    await this._prisma.$transaction(async (tx) => {
      for (const row of candidates) {
        const eid = row.event_id;
        try {
          await this.repo.updateEventDetectionToRejected(eid, tx);

          await this.repo.recordAuditLog(
            {
              eventId: eid,
              action: 'abandoned',
              reason: 'No response within SLA window',
              metadata: { auto: true, from_state: 'CAREGIVER_UPDATED' },
            },
            tx,
          );

          updatedIds.push(eid);
        } catch (err) {
          this.logger.warn(
            `Failed to mark abandoned for event ${eid}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    });

    return { count: updatedIds.length, eventIds: updatedIds };
  }

  // --------------------------- UTILITIES ---------------------------

  calculateResponseTime(proposalTime: Date, responseTime: Date): number {
    return Math.round((responseTime.getTime() - proposalTime.getTime()) / (1000 * 60)); // minutes
  }

  async isFirstCaregiverAction(
    eventId: string,
    caregiverId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = (tx as any) ?? this._prisma;
    try {
      const prev = await client.activity_logs.count({
        where: {
          resource_type: 'event',
          resource_id: eventId,
          actor_id: caregiverId,
          action: { in: ['propose_change', 'confirm_change', 'reject_change'] },
        },
      });
      return prev === 0;
    } catch {
      this.logger.warn('isFirstCaregiverAction check failed; assume false');
      return false;
    }
  }

  // --------------------------- STATS (BASIC) ---------------------------

  /**
   * Thống kê cơ bản dựa trên activity_logs (giữ được dữ liệu lịch sử).
   * Lưu ý: 'auto_approve' chỉ còn ý nghĩa lịch sử; luồng mới dùng 'auto_rejected' hoặc metadata.
   */
  async getBasicStats(userId: string, dateFrom?: Date, dateTo?: Date): Promise<EventAuditLogStats> {
    const timeFilter = dateFrom && dateTo ? { gte: dateFrom, lte: dateTo } : undefined;

    const base = {
      resource_type: 'event' as const,
      ...(timeFilter ? { timestamp: timeFilter } : {}),
    };

    const [
      proposed,
      confirmed,
      rejected,
      autoApproved,
      autoRejected,
      caregiverAssignments,
      abandoned,
    ] = await Promise.all([
      this._prisma.activity_logs.count({ where: { ...base, action: 'propose_change' } }),
      this._prisma.activity_logs.count({ where: { ...base, action: 'confirm_change' } }),
      this._prisma.activity_logs.count({ where: { ...base, action: 'reject_change' } }),
      this._prisma.activity_logs.count({ where: { ...base, action: 'auto_approve' } }),
      this._prisma.activity_logs.count({ where: { ...base, action: 'auto_reject' } }),
      this._prisma.activity_logs.count({ where: { ...base, action: 'caregiver_assigned' } }),
      this._prisma.activity_logs.count({
        where: { ...base, action: 'reject_change', message: { contains: 'abandoned' } },
      }),
    ]);

    const totalResponses = confirmed + rejected + autoApproved + autoRejected;
    const totalEvents = Math.max(proposed, caregiverAssignments);

    const toPct = (num: number, den: number) =>
      den > 0 ? Math.round((num / den) * 10000) / 100 : 0;

    return {
      total_events: totalEvents,
      total_proposed: proposed,
      confirmed,
      rejected,
      cancelled: 0,
      auto_rejected: autoRejected,
      abandoned,
      caregiver_invitations: caregiverAssignments,
      caregiver_assignments: caregiverAssignments,
      avg_response_time_hours: 0, // basic: không tính
      approval_rate: toPct(confirmed, totalResponses),
      rejection_rate: toPct(rejected, totalResponses),
      auto_rejection_rate: toPct(autoRejected, totalResponses),
      abandonment_rate: toPct(abandoned, totalEvents),
    };
  }

  // --------------------------- STATS (ENHANCED) ---------------------------

  /**
   * Thống kê nâng cao dựa trên bảng event_audit_log (nếu có).
   * Nếu lỗi hoặc bảng không tồn tại → fallback về getBasicStats.
   */
  async getEnhancedStats(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<EventAuditLogStats> {
    try {
      const rows = await this.repo.getEnhancedStats(dateFrom, dateTo);

      const get = (action: EventHistoryAction) =>
        rows.find((r) => r.action === action) ?? ({ count: '0', avg_response_time: null } as any);

      const proposed = Number(get('proposed').count || 0);
      const confirmed = Number(get('confirmed').count || 0);
      const rejected = Number(get('rejected').count || 0);
      const cancelled = Number(get('cancelled').count || 0);
      const autoRejected = Number(get('auto_rejected').count || 0);
      const abandoned = Number(get('abandoned').count || 0);
      const caregiverInvited = Number(get('caregiver_invited').count || 0);
      const caregiverAssigned = Number(get('caregiver_assigned').count || 0);

      const totalResponses = confirmed + rejected + cancelled + autoRejected;
      const totalEvents = Math.max(proposed, caregiverAssigned);

      const confirmedAvgMin = parseFloat(get('confirmed').avg_response_time || '0') || 0;
      const rejectedAvgMin = parseFloat(get('rejected').avg_response_time || '0') || 0;
      const avgResponseHours =
        Math.round(((confirmedAvgMin + rejectedAvgMin) / 2 / 60) * 100) / 100;

      const toPct = (num: number, den: number) =>
        den > 0 ? Math.round((num / den) * 10000) / 100 : 0;

      return {
        total_events: totalEvents,
        total_proposed: proposed,
        confirmed,
        rejected,
        cancelled,
        auto_rejected: autoRejected,
        abandoned,
        caregiver_invitations: caregiverInvited,
        caregiver_assignments: caregiverAssigned,
        avg_response_time_hours: avgResponseHours,
        approval_rate: toPct(confirmed, totalResponses),
        rejection_rate: toPct(rejected, totalResponses),
        auto_rejection_rate: toPct(autoRejected, totalResponses),
        abandonment_rate: toPct(abandoned, totalEvents),
      };
    } catch (err) {
      this.logger.warn(
        `Enhanced stats unavailable, fallback: ${err instanceof Error ? err.message : String(err)}`,
      );
      return this.getBasicStats(userId, dateFrom, dateTo);
    }
  }
}
