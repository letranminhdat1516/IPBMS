import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  EventAuditLogEntry,
  EventHistoryAction,
  EventHistoryRow as SharedEventHistoryRow,
} from '../../../core/types/event-audit-log.types';

export type EventHistoryRow = SharedEventHistoryRow;

@Injectable()
export class EventAuditLogRepository {
  private readonly logger = new Logger(EventAuditLogRepository.name);

  constructor(private readonly _prisma: PrismaService) {}

  async getHistoryForEvent(eventId: string): Promise<EventHistoryRow[]> {
    try {
      const rows = await this._prisma.$queryRaw<EventHistoryRow[]>`
        SELECT history_id, event_id, action, actor_id, actor_name, actor_role,
               previous_status, new_status, previous_event_type, new_event_type,
               previous_confirmation_state, new_confirmation_state, reason, metadata,
               response_time_minutes, is_first_action, created_at
        FROM event_history
        WHERE event_id = ${eventId}::uuid
        ORDER BY created_at ASC
      `;
      return rows ?? [];
    } catch (error) {
      this.logger.warn(
        `Failed to read event history for ${eventId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  async recordAuditLog(entry: EventAuditLogEntry, tx?: Prisma.TransactionClient): Promise<void> {
    const client: PrismaClient | Prisma.TransactionClient = (tx as any) ?? this._prisma;
    try {
      // Fetch last history row for this event to avoid inserting no-op / duplicate entries
      const last = (await client.$queryRawUnsafe(
        `SELECT action, previous_status, new_status, previous_event_type, new_event_type, previous_confirmation_state, new_confirmation_state, reason, metadata::text as metadata, is_first_action
         FROM event_history
         WHERE event_id = $1::uuid
         ORDER BY created_at DESC
         LIMIT 1`,
        entry.eventId,
      )) as Array<{
        action: string;
        previous_status: string | null;
        new_status: string | null;
        previous_event_type: string | null;
        new_event_type: string | null;
        previous_confirmation_state: string | null;
        new_confirmation_state: string | null;
        reason: string | null;
        metadata: string | null;
        is_first_action: boolean;
      }>;

      const lastRow = last && last.length ? last[0] : null;

      const stableStringify = (value: unknown): string | null => {
        if (value === null || value === undefined) return null;
        // Normalize objects by sorting keys so order differences don't cause false diffs
        const normalize = (obj: any): any => {
          if (obj === null || obj === undefined) return obj;
          if (Array.isArray(obj)) return obj.map(normalize);
          if (typeof obj === 'object') {
            return Object.keys(obj)
              .sort()
              .reduce((acc: any, key: string) => {
                acc[key] = normalize(obj[key]);
                return acc;
              }, {});
          }
          return obj;
        };
        try {
          const parsed = typeof value === 'string' ? JSON.parse(value as string) : value;
          return JSON.stringify(normalize(parsed));
        } catch {
          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        }
      };

      const incomingMetadata = stableStringify(entry.metadata);
      const lastMetadata = lastRow ? stableStringify(lastRow.metadata) : null;

      const comparableIncoming = {
        action: entry.action,
        previous_status: entry.previousStatus ?? null,
        new_status: entry.newStatus ?? null,
        previous_event_type: entry.previousEventType ?? null,
        new_event_type: entry.newEventType ?? null,
        previous_confirmation_state: entry.previousConfirmationState ?? null,
        new_confirmation_state: entry.newConfirmationState ?? null,
        reason: entry.reason ?? null,
        metadata: incomingMetadata ?? null,
        is_first_action: entry.isFirstAction ?? false,
      };

      const comparableLast = lastRow
        ? {
            action: lastRow.action,
            previous_status: lastRow.previous_status ?? null,
            new_status: lastRow.new_status ?? null,
            previous_event_type: lastRow.previous_event_type ?? null,
            new_event_type: lastRow.new_event_type ?? null,
            previous_confirmation_state: lastRow.previous_confirmation_state ?? null,
            new_confirmation_state: lastRow.new_confirmation_state ?? null,
            reason: lastRow.reason ?? null,
            metadata: lastMetadata ?? null,
            is_first_action: lastRow.is_first_action ?? false,
          }
        : null;

      const isNoop =
        !!lastRow && JSON.stringify(comparableLast) === JSON.stringify(comparableIncoming);

      if (isNoop) {
        this.logger.debug(
          `Skipping no-op audit log for event ${entry.eventId} (action=${entry.action})`,
        );
        return;
      }

      await client.$executeRawUnsafe(
        `
        INSERT INTO event_history (
          event_id, action, actor_id, actor_name, actor_role,
          previous_status, new_status, previous_event_type, new_event_type,
          previous_confirmation_state, new_confirmation_state, reason, metadata,
          response_time_minutes, is_first_action
        ) VALUES (
          $1::uuid, $2::event_history_action_enum, $3::uuid,
          $4, $5,
          $6, $7, $8::event_type_enum, $9::event_type_enum,
          $10::confirmation_state_enum, $11::confirmation_state_enum,
          $12, $13::jsonb, $14, $15
        )
        `,
        entry.eventId,
        entry.action,
        entry.actorId ?? null,
        entry.actorName ?? null,
        entry.actorRole ?? null,
        entry.previousStatus ?? null,
        entry.newStatus ?? null,
        entry.previousEventType ?? null,
        entry.newEventType ?? null,
        entry.previousConfirmationState ?? null,
        entry.newConfirmationState ?? null,
        entry.reason ?? null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.responseTimeMinutes ?? null,
        entry.isFirstAction ?? false,
      );

      this.logger.debug(
        `Recorded audit log: ${entry.action} for event ${entry.eventId} by ${entry.actorName || 'system'}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to record event audit log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getChangedEvents(opts: {
    since?: Date | string;
    dateTo?: Date | string;
    actor_id?: string;
    page?: number;
    limit?: number;
    actions?: EventHistoryAction[];
  }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.max(1, Math.min(200, opts.limit ?? 50));
    const offset = (page - 1) * limit;

    const sinceIso = opts.since ? new Date(opts.since).toISOString() : undefined;
    const dateToIso = opts.dateTo ? new Date(opts.dateTo).toISOString() : undefined;
    const hasSince = !!sinceIso;
    const hasActions = Array.isArray(opts.actions) && opts.actions.length > 0;
    const hasActor = !!opts.actor_id;
    const hasDateTo = !!dateToIso;

    const whereParts: Prisma.Sql[] = [];

    if (hasSince) {
      whereParts.push(Prisma.sql`eh.created_at >= ${Prisma.sql`${sinceIso}::timestamptz`}`);
    }
    if (hasDateTo) {
      whereParts.push(Prisma.sql`eh.created_at < ${Prisma.sql`${dateToIso}::timestamptz`}`);
    }
    if (hasActor) {
      whereParts.push(Prisma.sql`eh.actor_id = ${Prisma.sql`${opts.actor_id}::uuid`}`);
    }
    if (hasActions) {
      const casted = (opts.actions as string[]).map(
        (a) => Prisma.sql`${Prisma.sql`${a}`}::event_history_action_enum`,
      );
      whereParts.push(Prisma.sql`eh.action IN (${Prisma.join(casted)})`);
    }

    const WHERE: Prisma.Sql = whereParts.length
      ? Prisma.sql`WHERE ${Prisma.join(whereParts, Prisma.sql` AND ` as any)}`
      : Prisma.empty;

    try {
      const totalRows = await this._prisma.$queryRaw<{ total: string }[]>`
        SELECT COUNT(DISTINCT eh.event_id) AS total
        FROM event_history eh
        ${WHERE}
      `;
      const total = totalRows?.[0]?.total ? Number(totalRows[0].total) : 0;

      const rows = await this._prisma.$queryRaw<
        Array<{
          event_id: string;
          user_id: string | null;
          last_change_at: Date;
          change_count: string;
          last_action: string;
        }>
      >`
        SELECT eh.event_id,
               ed.user_id,
               MAX(eh.created_at) AS last_change_at,
               COUNT(*) AS change_count,
               (ARRAY_AGG(eh.action ORDER BY eh.created_at DESC))[1] AS last_action
        FROM event_history eh
        LEFT JOIN event_detections ed ON ed.event_id = eh.event_id::uuid
        ${WHERE}
        GROUP BY eh.event_id, ed.user_id
        ORDER BY last_change_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const items = (rows || []).map((r: any) => ({
        event_id: r.event_id,
        user_id: r.user_id ?? null,
        last_change_at: new Date(r.last_change_at),
        last_action: r.last_action,
        change_count: Number(r.change_count || 0),
      }));

      return { items, total, page, limit };
    } catch (err) {
      this.logger.error(
        `getChangedEvents failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { items: [], total: 0, page, limit };
    }
  }

  async findAbandonedCandidates(limit = 100) {
    const nowIso = new Date().toISOString();
    const candidates = await this._prisma.$queryRaw<
      Array<{ event_id: string; user_id: string | null }>
    >`
      SELECT event_id, user_id
      FROM event_detections
      WHERE confirmation_state = 'CAREGIVER_UPDATED'
        AND pending_until IS NOT NULL
        AND pending_until <= ${nowIso}::timestamptz
      LIMIT ${limit}
    `;
    return candidates ?? [];
  }

  async updateEventDetectionToRejected(eid: string, tx?: Prisma.TransactionClient) {
    const client = (tx as any) ?? this._prisma;
    await client.$executeRaw`
      UPDATE event_detections
      SET confirmation_state = 'REJECTED_BY_CUSTOMER',
          acknowledged_at = NOW(),
          pending_until = NULL,
          proposed_status = NULL
      WHERE event_id = ${eid}::uuid
    `;
  }

  async getEnhancedStats(dateFrom?: Date, dateTo?: Date) {
    const whereParts: string[] = [];
    const args: any[] = [];
    let i = 1;

    if (dateFrom) {
      whereParts.push(`created_at >= $${i}::timestamptz`);
      args.push(dateFrom.toISOString());
      i++;
    }
    if (dateTo) {
      whereParts.push(`created_at <= $${i}::timestamptz`);
      args.push(dateTo.toISOString());
      i++;
    }
    const WHERE = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const rows = await this._prisma.$queryRawUnsafe<
      Array<{ action: EventHistoryAction; count: string; avg_response_time: string | null }>
    >(
      `
      SELECT action, COUNT(*)::text AS count, AVG(response_time_minutes)::text AS avg_response_time
      FROM event_audit_log
      ${WHERE}
      GROUP BY action
      ORDER BY action
      `,
      ...args,
    );

    return rows ?? [];
  }
}
