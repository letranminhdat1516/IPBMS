import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { TicketHistory, HistoryAction } from '../../shared/types/ticket-history';
import deepEqual from '../../shared/utils/deep-equal.util';

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  constructor(private readonly _prisma: PrismaService) {}

  // Sanitize helper to produce JSON-serializable plain objects
  private sanitizeForPrisma(input: any): any {
    if (input === null || input === undefined) return undefined;
    const seen = new WeakSet();

    const isPrismaLike = (val: any) => {
      try {
        if (!val || typeof val !== 'object') return false;
        if ('$transaction' in val) return true;
        const tag = (val as any)?.[Symbol.toStringTag];
        if (typeof tag === 'string' && tag.toLowerCase().includes('prisma')) return true;
      } catch {
        // ignore
      }
      return false;
    };

    const helper = (val: any): any => {
      if (val === null || val === undefined) return val;
      if (typeof val === 'function') return undefined;
      if (isPrismaLike(val)) return undefined;
      if (typeof val !== 'object') return val;
      if (val instanceof Date) return val.toISOString();
      if (seen.has(val)) return undefined;
      seen.add(val);
      if (Array.isArray(val)) return val.map((v) => helper(v)).filter((v) => v !== undefined);

      const proto = Object.getPrototypeOf(val);
      const isPlain = proto === Object.prototype || proto === null;
      if (!isPlain) return undefined;

      const out: any = {};
      for (const k of Object.keys(val)) {
        try {
          const v = helper((val as any)[k]);
          if (v !== undefined) out[k] = v;
        } catch {
          // skip problematic keys
        }
      }
      return out;
    };

    try {
      return helper(input);
    } catch (err) {
      this.logger.warn('sanitizeForPrisma failed', (err as any)?.message ?? err);
      return undefined;
    }
  }

  private mapRowToHistory(row: any): TicketHistory {
    return {
      history_id: row.history_id,
      ticket_id: row.ticket_id,
      user_id: row.user_id,
      action: row.action as HistoryAction,
      old_values: row.old_values,
      new_values: row.new_values,
      description: row.description,
      metadata: row.metadata,
      created_at: row.created_at,
      ticket: undefined as any,
    } as TicketHistory;
  }

  async logAction(
    ticketId: string,
    userId: string,
    action: HistoryAction,
    description?: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>,
    tx?: Prisma.TransactionClient,
  ): Promise<TicketHistory> {
    // Basic input validation
    if (!ticketId || typeof ticketId !== 'string') {
      throw new BadRequestException('ticketId is required');
    }
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('userId is required');
    }

    // guard: metadata must never be a Prisma client / tx
    if (metadata && (metadata as any)?.$transaction) {
      this.logger.warn('metadata looks like a Prisma transaction - dropping metadata');
      metadata = undefined;
    }

    const client = (tx as any) ?? this._prisma;
    this.logger.debug(`logAction start ticket=${ticketId} user=${userId} action=${action}`);

    const safeOld = this.sanitizeForPrisma(oldValues ?? undefined);
    const safeNew = this.sanitizeForPrisma(newValues ?? undefined);
    const safeMeta = this.sanitizeForPrisma(metadata ?? undefined);

    const row = await client.ticket_history.create({
      data: {
        ticket_id: ticketId,
        user_id: userId,
        action,
        description: description ?? undefined,
        old_values: safeOld ?? undefined,
        new_values: safeNew ?? undefined,
        metadata: safeMeta ?? undefined,
      },
    });

    this.logger.log(`history created ${row.history_id} ticket=${ticketId} action=${action}`);

    return this.mapRowToHistory(row);
  }

  async findByTicket(ticketId: string): Promise<TicketHistory[]> {
    const rows = await this._prisma.ticket_history.findMany({
      where: { ticket_id: ticketId },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => this.mapRowToHistory(r));
  }

  async findOne(id: string): Promise<TicketHistory> {
    if (!id || typeof id !== 'string') throw new BadRequestException('id is required');
    const row = await this._prisma.ticket_history.findUnique({ where: { history_id: id } });
    if (!row) throw new NotFoundException('History record not found');
    return this.mapRowToHistory(row);
  }

  async getTicketTimeline(ticketId: string): Promise<TicketHistory[]> {
    const rows = await this._prisma.ticket_history.findMany({
      where: { ticket_id: ticketId },
      orderBy: { created_at: 'asc' },
    });
    return rows.map((r) => this.mapRowToHistory(r));
  }

  /**
   * Expand a single history row to include a `changes` array and `change_count`.
   * This does not split the row into multiple rows; it augments the row with per-field change details.
   * Options:
   *  - limit: cap the number of changes returned (useful to avoid huge payloads)
   *  - recursive: if true, will not currently deep-traverse (reserved for future)
   */
  expandHistoryRow(
    row: TicketHistory,
    options?: { limit?: number; recursive?: boolean },
  ): TicketHistory & { change_count: number; changes: Array<any> } {
    const limit =
      options?.limit && Number.isFinite(Number(options.limit)) ? Number(options.limit) : undefined;
    const oldVals = (row.old_values as Record<string, any>) ?? {};
    const newVals = (row.new_values as Record<string, any>) ?? {};

    const keys = Array.from(
      new Set([...Object.keys(oldVals || {}), ...Object.keys(newVals || {})]),
    );
    const changes: Array<{ field: string; path: string; old: any; new: any }> = [];

    for (const k of keys) {
      const oldVal = (oldVals as any)[k];
      const newVal = (newVals as any)[k];
      // Only include if different or if newVal exists (preserve intent)
      if (oldVal === undefined && newVal === undefined) continue;
      if (deepEqual(oldVal, newVal)) continue;
      changes.push({ field: k, path: k, old: oldVal, new: newVal });
      if (limit && changes.length >= limit) break;
    }

    const augmented: any = {
      ...row,
      change_count: changes.length,
      changes,
    };
    return augmented as TicketHistory & { change_count: number; changes: Array<any> };
  }

  async getUserActivity(userId: string, limit: number = 50): Promise<TicketHistory[]> {
    const rows = await this._prisma.ticket_history.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.mapRowToHistory(r));
  }

  async getRecentActivity(limit: number = 100): Promise<TicketHistory[]> {
    const rows = await this._prisma.ticket_history.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.mapRowToHistory(r));
  }

  // Helper methods for common actions
  async logTicketCreation(
    ticket: any,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<TicketHistory> {
    return this.logAction(
      ticket.ticket_id,
      userId,
      HistoryAction.CREATED,
      `Ticket created: ${ticket.title || 'Untitled'}`,
      undefined, // oldValues
      {
        title: ticket.title,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        tags: ticket.tags,
      }, // newValues
      undefined, // metadata
      tx, // tx (ensure last param)
    );
  }

  async logTicketUpdate(
    ticketId: string,
    userId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    tx?: Prisma.TransactionClient,
  ): Promise<TicketHistory> {
    return this.logAction(
      ticketId,
      userId,
      HistoryAction.UPDATED,
      'Ticket updated',
      oldValues,
      newValues,
      undefined,
      tx,
    );
  }

  async logStatusChange(
    ticketId: string,
    userId: string,
    oldStatus: string,
    newStatus: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.logAction(
      ticketId,
      userId,
      HistoryAction.STATUS_CHANGED,
      `Status changed from ${oldStatus} to ${newStatus}`,
      { status: oldStatus },
      { status: newStatus },
      undefined,
      tx,
    );
  }

  async logAssignment(
    ticketId: string,
    userId: string,
    agentId: string,
    agentName?: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.logAction(
      ticketId,
      userId,
      HistoryAction.ASSIGNED,
      `Assigned to ${agentName || 'agent'}`,
      undefined,
      { assigned_to: agentId },
      undefined,
      tx,
    );
  }

  async logUnassignment(
    ticketId: string,
    userId: string,
    agentId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.logAction(
      ticketId,
      userId,
      HistoryAction.UNASSIGNED,
      'Unassigned from agent',
      { assigned_to: agentId },
      { assigned_to: null },
      undefined,
      tx,
    );
  }

  async logMessageAdded(
    ticketId: string,
    userId: string,
    messageType: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.logAction(
      ticketId,
      userId,
      HistoryAction.MESSAGE_ADDED,
      `New ${messageType} message added`,
      undefined,
      undefined,
      undefined,
      tx,
    );
  }

  async updateMessageContent(historyId: string, userId: string, newContent: string) {
    if (!historyId || !userId) throw new BadRequestException('historyId and userId are required');
    const row = await this._prisma.ticket_history.findUnique({ where: { history_id: historyId } });
    if (!row) throw new NotFoundException('History record not found');
    if (row.action !== HistoryAction.MESSAGE_ADDED)
      throw new BadRequestException('Not a message history entry');
    if (row.user_id !== userId)
      throw new ForbiddenException('Only the original sender can edit this message');

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (row.created_at < fiveMinutesAgo) throw new BadRequestException('Edit window expired');

    this.logger.debug(`updateMessageContent history=${historyId} by=${userId}`);

    const updated = await this._prisma.ticket_history.update({
      where: { history_id: historyId },
      data: {
        metadata: {
          ...((row.metadata as any) ?? {}),
          content: newContent,
          edited_at: new Date(),
        } as any,
      },
    });

    this.logger.log(`message content updated ${historyId} by ${userId}`);
    return this.mapRowToHistory(updated);
  }

  async recordMessageRead(historyId: string, readerId: string, tx?: Prisma.TransactionClient) {
    if (!historyId || !readerId)
      throw new BadRequestException('historyId and readerId are required');
    const messageHistory = await this._prisma.ticket_history.findUnique({
      where: { history_id: historyId },
    });
    if (!messageHistory) throw new NotFoundException('Original message not found');

    this.logger.debug(`recordMessageRead history=${historyId} by=${readerId}`);

    return this.logAction(
      messageHistory.ticket_id,
      readerId,
      HistoryAction.UPDATED,
      'Message read',
      undefined,
      undefined,
      { message_id: historyId, read_by: readerId, read_at: new Date() },
      tx,
    );
  }

  async getUnreadCountForTicket(ticketId: string, userId: string): Promise<number> {
    //  Efficient DB-based count: count message_added entries for ticket where sender != user
    //  and there is no corresponding 'read' update by this user (metadata->>'message_id' = message id)
    //  (Tiếng Việt): Thay vì tải toàn bộ timeline về để tính số message chưa đọc (có thể rất lớn),
    //  ta dùng 1 truy vấn SQL với NOT EXISTS để đếm trực tiếp các message chưa được đánh dấu là "read" bởi user.
    if (!ticketId || !userId) throw new BadRequestException('ticketId and userId are required');

    this.logger.debug(`getUnreadCountForTicket ticket=${ticketId} user=${userId}`);

    const rows = await this._prisma.$queryRaw<Array<{ cnt: string }>>`
      SELECT COUNT(*) AS cnt
      FROM ticket_history m
      WHERE m.ticket_id = ${ticketId}
        AND m.action = 'message_added'
        AND m.user_id <> ${userId}
        AND NOT EXISTS (
          SELECT 1 FROM ticket_history r
          WHERE r.action = 'updated'
            AND (r.metadata->>'message_id') = m.history_id
            AND (r.metadata->>'read_by') = ${userId}
        )
    `;
    const cnt = rows?.[0] ? Number(rows[0].cnt) : 0;
    this.logger.debug(`unread count for ticket=${ticketId} user=${userId} => ${cnt}`);
    return cnt;
  }

  async logRatingAdded(ticketId: string, userId: string, rating: number) {
    return this.logAction(
      ticketId,
      userId,
      HistoryAction.RATED,
      `Ticket rated ${rating} stars`,
      undefined,
      { rating },
    );
  }

  async logTicketClosed(ticketId: string, userId: string) {
    return this.logAction(ticketId, userId, HistoryAction.CLOSED, 'Ticket closed');
  }

  async logTicketReopened(ticketId: string, userId: string) {
    return this.logAction(ticketId, userId, HistoryAction.REOPENED, 'Ticket reopened');
  }
  // Dashboard analytics methods implemented using prisma raw queries
  async getAverageRatingSince(days: number): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    // (Tiếng Việt): Tính điểm trung bình cho các rating trong khoảng thời gian nhất định.
    // Dùng $queryRaw để tận dụng các hàm aggregate của Postgres trên JSON field (new_values->>'rating').
    const rows = await this._prisma.$queryRaw<Array<{ averageRating: string | null }>>`
      SELECT AVG((history.new_values ->> 'rating')::numeric) AS "averageRating"
      FROM ticket_history history
      WHERE history.action = 'rated' AND history.created_at >= ${since}
    `;
    const val = rows?.[0]?.averageRating;
    if (!val) return 0;
    return typeof val === 'number' ? val : parseFloat(String(val));
  }

  async getRatingStatistics(): Promise<{
    averageRating: number;
    totalRatings: number;
    ratingDistribution: Record<number, number>;
  }> {
    // (Tiếng Việt): Lấy tất cả rating để tính thống kê phân phối.
    // Với dataset lớn có thể muốn làm GROUP BY trực tiếp ở DB để tránh chuyển nhiều hàng về app.
    const rows = await this._prisma.$queryRaw<Array<{ rating: string | null }>>`
      SELECT (history.new_values ->> 'rating') AS rating
      FROM ticket_history history
      WHERE history.action = 'rated'
    `;

    if (!rows || rows.length === 0)
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };

    let total = 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let count = 0;
    for (const r of rows) {
      const v = r.rating ? Number(r.rating) : undefined;
      if (!v || Number.isNaN(v)) continue;
      total += v;
      distribution[v] = (distribution[v] || 0) + 1;
      count += 1;
    }

    return {
      averageRating: count ? total / count : 0,
      totalRatings: count,
      ratingDistribution: distribution,
    };
  }

  async getAgentRatingStatistics(): Promise<
    Array<{ agentId: string; averageRating: number; totalRatings: number }>
  > {
    // (Tiếng Việt): Tính điểm trung bình theo agent bằng GROUP BY ở DB để tránh load dataset lớn về app.
    const rows = await this._prisma.$queryRaw<
      Array<{ agentid: string | null; averagerating: string | null; totalratings: string }>
    >`
      SELECT t.assigned_to AS agentId, AVG((h.new_values ->> 'rating')::numeric) AS averageRating, COUNT(*) AS totalRatings
      FROM ticket_history h
      LEFT JOIN support_tickets t ON t.ticket_id = h.ticket_id
      WHERE h.action = 'rated' AND t.assigned_to IS NOT NULL
      GROUP BY t.assigned_to
    `;

    return (rows || [])
      .filter((r: any) => r.agentid)
      .map((r: any) => ({
        agentId: r.agentid as string,
        averageRating: r.averagerating ? parseFloat(String(r.averagerating)) : 0,
        totalRatings: Number(r.totalratings) || 0,
      }));
  }

  async getRatingsByCategory(): Promise<
    Array<{ category: string; count: number; averageRating: number }>
  > {
    // (Tiếng Việt): Lấy thống kê rating theo category. Dùng GROUP BY ở DB và AVG trên trường JSON để hiệu quả.
    const rows = await this._prisma.$queryRaw<
      Array<{ category: string | null; count: string; averagerating: string | null }>
    >`
      SELECT t.category AS category, COUNT(*) AS count, AVG((h.new_values ->> 'rating')::numeric) AS averageRating
      FROM ticket_history h
      LEFT JOIN support_tickets t ON t.ticket_id = h.ticket_id
      WHERE h.action = 'rated'
      GROUP BY t.category
    `;

    return (rows || [])
      .filter((r: any) => !!r.category)
      .map((r: any) => ({
        category: r.category as string,
        count: Number(r.count) || 0,
        averageRating: r.averagerating ? parseFloat(String(r.averagerating)) : 0,
      }))
      .sort((a: any, b: any) => b.count - a.count);
  }
}
