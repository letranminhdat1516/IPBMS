import { Injectable, Logger } from '@nestjs/common';
import { events, event_status_enum, event_type_enum, Prisma } from '@prisma/client';
import { parseISOToDate } from '../../../shared/utils';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

@Injectable()
export class EventsRepository extends BasePrismaRepository {
  private readonly logger = new Logger(EventsRepository.name);
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  /**
   * Small helper to attach date range filters to a Prisma `where` object.
   * `field` is the date field name on the model (e.g. 'detected_at' or 'created_at').
   */
  private attachDateRange(where: any, field: string, start?: Date | string, end?: Date | string) {
    if (!start && !end) return;
    (where as any)[field] = {} as any;

    // Normalize start: accept Date or parse ISO-like strings safely
    if (start) {
      if (start instanceof Date) {
        if (!isNaN(start.getTime())) (where as any)[field].gte = start;
      } else if (typeof start === 'string') {
        const parsed = parseISOToDate(start);
        if (parsed) (where as any)[field].gte = parsed;
      }
    }

    // Normalize end: accept Date or parse ISO-like strings safely
    if (end) {
      if (end instanceof Date) {
        if (!isNaN(end.getTime())) (where as any)[field].lte = end;
      } else if (typeof end === 'string') {
        const parsed = parseISOToDate(end);
        if (parsed) (where as any)[field].lte = parsed;
      }
    }
  }

  async findByIdWithContext(event_id: string): Promise<events | null> {
    return this.prisma.events.findUnique({
      where: { event_id },
      include: {
        cameras: true,
        snapshots: {
          include: {
            files: {
              select: {
                cloud_url: true,
              },

              orderBy: { created_at: 'desc' },
              take: 1,
            },
          },
        },
        user: true,
      },
    });
  }

  async updateConfirm(
    event_id: string,
    confirm: boolean,
    notes?: string,
    acknowledgedBy?: string,
  ): Promise<events> {
    const data: any = {
      confirm_status: confirm,
      notes,
    };

    // Set acknowledged_at only when confirm is truthy
    if (confirm) data.acknowledged_at = new Date();

    // Persist who acknowledged/confirmed if provided
    if (acknowledgedBy) data.acknowledged_by = acknowledgedBy;

    const result = await this.prisma.events.update({
      where: { event_id },
      data,
    });
    return result as unknown as events;
  }

  async updateConfirmStatus(
    event_id: string,
    confirm_status: boolean,
    notes?: string,
  ): Promise<events> {
    const result = await this.prisma.events.update({
      where: { event_id },
      data: {
        confirm_status,
        notes,
      },
    });
    return result as unknown as events;
  }

  async listAll(limit?: number): Promise<events[]> {
    const result = await this.prisma.events.findMany({
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        cameras: true,
        snapshots: {
          include: {
            files: {
              select: { cloud_url: true, created_at: true },
              orderBy: { created_at: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
    return result as unknown as events[];
  }

  async listAllForCaregiver(caregiverId: string, limit?: number): Promise<events[]> {
    // Assuming caregiver has access to events of assigned customers
    // This might need adjustment based on business logic
    const assignments = await this.prisma.caregiver_invitations.findMany({
      where: {
        caregiver_id: caregiverId,
        is_active: true,
      },
      select: { customer_id: true },
    });

    const customerIds = assignments.map((a: { customer_id: string }) => a.customer_id);

    if (customerIds.length === 0) return [];

    const result = await this.prisma.events.findMany({
      where: {
        user_id: { in: customerIds },
      },
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        cameras: true,
        snapshots: {
          include: {
            files: {
              select: { cloud_url: true, created_at: true },
              orderBy: { created_at: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
    return result as unknown as events[];
  }

  async recentByUser(user_id: string, limit?: number): Promise<events[]> {
    const result = await this.prisma.events.findMany({
      where: { user_id },
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        cameras: true,
        snapshots: {
          include: {
            files: { select: { cloud_url: true }, orderBy: { created_at: 'desc' }, take: 1 },
          },
        },
      },
    });
    return result as unknown as events[];
  }

  async listPaginated(filters: any): Promise<{ data: events[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      user_id,
      event_type,
      status,
      lifecycle_state,
      startDate,
      endDate,
    } = filters;

    const where: Prisma.eventsWhereInput = {};

    if (user_id) where.user_id = user_id;
    if (event_type) {
      where.event_type = Array.isArray(event_type) ? { in: event_type } : event_type;
    }

    if (status) {
      where.status = Array.isArray(status) ? { in: status } : status;
    }

    if (lifecycle_state) {
      where.lifecycle_state = Array.isArray(lifecycle_state)
        ? { in: lifecycle_state }
        : lifecycle_state;
    }
    // Debug: log the where clause to help trace unexpected results (e.g., lifecycle_state filters)
    try {
      this.logger.debug(`[listPaginated] where=${JSON.stringify(where)}`);
    } catch {
      // swallow logging errors
    }
    this.attachDateRange(where, 'created_at', startDate, endDate);

    const [data, total] = await Promise.all([
      this.prisma.events.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          cameras: true,
          snapshots: {
            include: {
              files: { select: { cloud_url: true }, orderBy: { created_at: 'desc' }, take: 1 },
            },
          },
        },
      }),
      this.prisma.events.count({ where }),
    ]);

    return { data: data as unknown as events[], total };
  }

  async listPaginatedForCaregiverByUserId(
    caregiverUserId: string,
    filters: any,
  ): Promise<{ data: events[]; total: number }> {
    // Get customers assigned to this caregiver
    const assignments = await this.prisma.caregiver_invitations.findMany({
      where: {
        caregiver_id: caregiverUserId,
        is_active: true,
      },
      select: { customer_id: true },
    });

    const customerIds = assignments.map((a: { customer_id: string }) => a.customer_id);

    const {
      page = 1,
      limit = 10,
      event_type,
      status,
      lifecycle_state,
      startDate,
      endDate,
    } = filters;

    const where: Prisma.eventsWhereInput = {
      user_id: { in: customerIds },
    };

    if (customerIds.length === 0) return { data: [], total: 0 };

    if (event_type) {
      where.event_type = Array.isArray(event_type) ? { in: event_type } : event_type;
    }

    if (status) {
      where.status = Array.isArray(status) ? { in: status } : status;
    }

    if (lifecycle_state) {
      where.lifecycle_state = Array.isArray(lifecycle_state)
        ? { in: lifecycle_state }
        : lifecycle_state;
    }
    // Debug: log where for caregiver queries as well
    try {
      this.logger.debug(
        `[listPaginatedForCaregiverByUserId] caregiver=${caregiverUserId} where=${JSON.stringify(
          where,
        )}`,
      );
    } catch {
      // ignore logging errors
    }
    this.attachDateRange(where, 'created_at', startDate, endDate);

    const [data, total] = await Promise.all([
      this.prisma.events.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          cameras: true,
          snapshots: true,
        },
      }),
      this.prisma.events.count({ where }),
    ]);

    return { data: data as unknown as events[], total };
  }

  async listPaginatedForOwnerUserId(
    ownerUserId: string,
    filters: any,
  ): Promise<{ data: events[]; total: number }> {
    // Assuming owner is the customer
    return this.listPaginated({ ...filters, user_id: ownerUserId });
  }

  async updateStatus(
    event_id: string,
    status: event_status_enum,
    notes?: string,
    eventType?: event_type_enum,
  ): Promise<events> {
    const result = await this.prisma.events.update({
      where: { event_id },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(eventType !== undefined && { event_type: eventType }),
      },
    });
    return result as unknown as events;
  }

  async updateLifecycle(event_id: string, lifecycle_state: string): Promise<events> {
    const result = await this.prisma.events.update({
      where: { event_id },
      // Prisma client in this workspace may not be regenerated yet; cast to any
      data: {
        lifecycle_state: lifecycle_state,
        ...(lifecycle_state === 'CANCELED' ? { is_canceled: true } : {}),
      } as any,
    });
    return result as unknown as events;
  }

  async getSnapshotsOfEvent(
    event_id: string,
    options: { windowSec: number; limit: number },
  ): Promise<any[]> {
    const event = await this.prisma.events.findUnique({
      where: { event_id },
      select: { detected_at: true, camera_id: true },
    });

    if (!event) return [];

    const startTime = new Date(event.detected_at.getTime() - options.windowSec * 1000);
    const endTime = new Date(event.detected_at.getTime() + options.windowSec * 1000);

    const result = await this.prisma.snapshots.findMany({
      where: {
        camera_id: event.camera_id,
        captured_at: {
          gte: startTime,
          lte: endTime,
        },
      },
      take: options.limit,
      orderBy: { captured_at: 'desc' },
    });
    return result as unknown as any[];
  }

  async getEventOwnerUserId(event_id: string): Promise<string | null> {
    const event = await this.prisma.events.findUnique({
      where: { event_id },
      select: { user_id: true },
    });

    return event?.user_id || null;
  }

  /**
   * Find candidate events for escalation.
   * Returns events that are PENDING, not canceled, and either have notification_attempts >= minAttempts
   * or have pending_since/created_at older than cutoffDate. Limit controls maximum rows returned.
   */
  async findPendingForEscalation(
    cutoffDate: Date,
    minAttempts = 3,
    limit = 500,
  ): Promise<Partial<events>[]> {
    const rows = await this.prisma.events.findMany({
      where: {
        verification_status: 'PENDING',
        is_canceled: false,
        OR: [
          { notification_attempts: { gte: minAttempts } },
          { pending_since: { lte: cutoffDate } },
          { created_at: { lte: cutoffDate } },
        ],
      },
      take: limit,
      select: {
        event_id: true,
        user_id: true,
        event_type: true,
        escalation_count: true,
        status: true,
        pending_since: true,
        created_at: true,
        notification_attempts: true,
        lifecycle_state: true,
        confirmation_state: true,
        acknowledged_at: true,
        acknowledged_by: true,
      },
    });

    return rows as Partial<events>[];
  }

  /**
   * Find events that meet escalation criteria based on per-type thresholds and forwardMode.
   * thresholdsSeconds: mapping event_type -> seconds (default will be used if not present)
   * forwardMode: 'timeout' | 'attempts' | 'both'
   */
  async findEventsToEscalate(
    thresholdsSeconds: Record<string, number>,
    forwardMode: 'timeout' | 'attempts' | 'both' = 'timeout',
    minAttempts = 3,
    limit = 500,
  ): Promise<Array<Record<string, any>>> {
    const defaultSec = Number(thresholdsSeconds['default'] ?? 30);

    const thresholdsJson = JSON.stringify(thresholdsSeconds || {});
    const timeoutCondition = Prisma.sql`
      EXTRACT(EPOCH FROM (now() - COALESCE(pending_since, created_at))) >= (
        COALESCE(((${thresholdsJson})::jsonb ->> (event_type::text))::int, ${defaultSec})
      )
    `;

    const attemptsCondition = Prisma.sql`notification_attempts >= ${Number(minAttempts)}`;

    const modeCond =
      forwardMode === 'both'
        ? Prisma.sql`(${timeoutCondition}) OR (${attemptsCondition})`
        : forwardMode === 'attempts'
          ? Prisma.sql`(${attemptsCondition})`
          : Prisma.sql`(${timeoutCondition})`;

    const query = Prisma.sql`
      SELECT event_id, user_id, event_type, escalation_count, status,
             COALESCE(pending_since, created_at) as base_time, notification_attempts,
             lifecycle_state, confirmation_state, acknowledged_at, acknowledged_by,
             EXTRACT(EPOCH FROM (now() - COALESCE(pending_since, created_at))) as elapsed_sec
      FROM event_detections
      WHERE verification_status = 'PENDING'
        AND is_canceled = false
        AND ${modeCond}
      LIMIT ${Number(limit)}
    `;

    const rows: any[] = await this.prisma.$queryRaw(query);
    return rows || [];
  }

  async create(data: Partial<events>): Promise<events> {
    const result = await this.prisma.events.create({
      data: data as Prisma.eventsCreateInput,
    });
    return result as unknown as events;
  }

  // Caregiver proposes a status change (creates a pending proposal)
  async proposeStatus(
    event_id: string,
    caregiver_id: string,
    proposed_status: string,
    pendingUntil: Date | null,
    reason?: string,
  ) {
    // Only allow propose when no confirmed-by-customer state exists. Allowed states: NULL, DETECTED, REJECTED_BY_CUSTOMER
    await this.prisma.$executeRawUnsafe(
      `UPDATE event_detections
       SET proposed_status = $1,
           verify_by = $2,
           pending_until = $3,
           pending_reason = $4,
           confirmation_state = 'CAREGIVER_UPDATED',
           acknowledged_by = NULL,
           acknowledged_at = NULL
       WHERE event_id = $5
         AND (confirmation_state IS NULL OR confirmation_state = 'DETECTED' OR confirmation_state = 'REJECTED_BY_CUSTOMER')`,
      proposed_status,
      caregiver_id,
      pendingUntil,
      reason ?? null,
      event_id,
    );
    return (await this.findByIdWithContext(event_id)) as events;
  }

  // Customer confirms (approve or reject)
  async confirmStatus(event_id: string, customer_id: string, action: 'approve' | 'reject') {
    if (action === 'approve') {
      await this.prisma.$executeRawUnsafe(
        `UPDATE event_detections
         SET status = proposed_status,
             proposed_status = NULL,
             pending_until = NULL,
             acknowledged_by = $1,
             acknowledged_at = now(),
             confirmation_state = 'CONFIRMED_BY_CUSTOMER'
         WHERE event_id = $2`,
        customer_id,
        event_id,
      );
    } else {
      await this.prisma.$executeRawUnsafe(
        `UPDATE event_detections
         SET proposed_status = NULL,
             pending_until = NULL,
             acknowledged_by = $1,
             acknowledged_at = now(),
             confirmation_state = 'REJECTED_BY_CUSTOMER'
         WHERE event_id = $2`,
        customer_id,
        event_id,
      );
    }
    return (await this.findByIdWithContext(event_id)) as events;
  }

  // Find pending events that need auto-approve
  async findPendingForAutoApprove(limit = 100): Promise<events[]> {
    const now = new Date().toISOString();
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM event_detections WHERE pending_until IS NOT NULL AND pending_until <= $1 AND confirmation_state = 'CAREGIVER_UPDATED' AND acknowledged_by IS NULL LIMIT $2`,
      now,
      limit,
    );
    return rows as unknown as events[];
  }

  async findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<events[]> {
    const result = await this.prisma.events.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { created_at: 'desc' },
      include: {
        cameras: true,
        snapshots: true,
      },
    });
    return result as unknown as events[];
  }

  // Find events for a caregiver's assigned customers within a date range
  async findByRangeForCaregiver(
    caregiverUserId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<events[]> {
    // Get customers assigned to this caregiver
    const assignments = await this.prisma.caregiver_invitations.findMany({
      where: {
        caregiver_id: caregiverUserId,
        is_active: true,
      },
      select: { customer_id: true },
    });

    const customerIds = assignments.map((a: { customer_id: string }) => a.customer_id);

    // Debug logging to help trace why caregivers may see 0 events
    try {
      this.logger.debug(
        `[findByRangeForCaregiver] caregiver=${caregiverUserId} customerCount=${customerIds.length} customers=${JSON.stringify(
          customerIds.slice(0, 50),
        )} start=${startDate.toISOString()} end=${endDate.toISOString()}`,
      );
    } catch {
      // swallow logging errors to avoid affecting normal flow
    }

    if (customerIds.length === 0) return [];

    const result = await this.prisma.events.findMany({
      where: {
        user_id: { in: customerIds },
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { created_at: 'desc' },
      include: {
        cameras: true,
        snapshots: true,
      },
    });

    try {
      const cnt = (result || []).length;
      const msg = `[findByRangeForCaregiver] caregiver=${caregiverUserId} resultCount=${cnt}`;
      this.logger.debug(msg);
    } catch {
      // ignore
    }

    return result as unknown as events[];
  }

  /**
   * Helper: get list of customer ids assigned to a caregiver
   */
  async getAssignedCustomerIds(caregiverUserId: string): Promise<string[]> {
    const assignments = await this.prisma.caregiver_invitations.findMany({
      where: { caregiver_id: caregiverUserId, is_active: true },
      select: { customer_id: true },
    });
    return assignments.map((a: { customer_id: string }) => a.customer_id);
  }

  // ========== AGGREGATES (for analytics) ==========
  async getSeverityCounts(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    danger: number;
    warning: number;
    suspect: number;
    unknowns: number;
    normal: number;
  }> {
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT
    COALESCE(COUNT(*) FILTER (WHERE lower(status::text) = 'danger'),0) as danger,
    COALESCE(COUNT(*) FILTER (WHERE lower(status::text) = 'warning'),0) as warning,
    COALESCE(COUNT(*) FILTER (WHERE lower(status::text) = 'suspect'),0) as suspect,
    COALESCE(COUNT(*) FILTER (WHERE lower(status::text) = 'unknowns'),0) as unknowns,
    COALESCE(COUNT(*) FILTER (WHERE status IS NULL OR lower(status::text) NOT IN ('danger','warning','suspect','unknowns')),0) as normal
    FROM event_detections
    WHERE user_id = $1::uuid AND created_at >= $2::timestamptz AND created_at <= $3::timestamptz`,
      userId,
      startDate.toISOString(),
      endDate.toISOString(),
    );
    const r = rows[0] ?? { danger: 0, warning: 0, suspect: 0, unknowns: 0, normal: 0 };
    return {
      danger: Number(r.danger || 0),
      warning: Number(r.warning || 0),
      suspect: Number(r.suspect || 0),
      unknowns: Number(r.unknowns || 0),
      normal: Number(r.normal || 0),
    };
  }

  async getResolvedCounts(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ resolved_true: number; resolved_false: number }> {
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT
        COALESCE(COUNT(*) FILTER (WHERE confirm_status = true),0) as resolved_true,
        COALESCE(COUNT(*) FILTER (WHERE dismissed_at IS NOT NULL),0) as resolved_false
    FROM event_detections
  WHERE user_id = $1::uuid AND created_at >= $2::timestamptz AND created_at <= $3::timestamptz`,
      userId,
      startDate.toISOString(),
      endDate.toISOString(),
    );
    const r = rows[0] ?? { resolved_true: 0, resolved_false: 0 };
    return {
      resolved_true: Number(r.resolved_true || 0),
      resolved_false: Number(r.resolved_false || 0),
    };
  }

  async getTopEventType(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ type: string | null; count: number }> {
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT event_type::text as type, COUNT(*) as cnt FROM event_detections
    WHERE user_id = $1::uuid AND created_at >= $2::timestamptz AND created_at <= $3::timestamptz
    GROUP BY event_type::text
    ORDER BY cnt DESC LIMIT 1`,
      userId,
      startDate.toISOString(),
      endDate.toISOString(),
    );
    const r = rows[0];
    if (!r) return { type: null, count: 0 };
    return { type: r.type ?? null, count: Number(r.cnt || 0) };
  }

  async getHourlyCounts(
    userId: string,
    startDate: Date,
    endDate: Date,
    timeZone: string,
  ): Promise<Array<{ hour: number; count: number }>> {
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT EXTRACT(hour FROM created_at AT TIME ZONE $4) as hour, COUNT(*) as cnt
   FROM event_detections
   WHERE user_id = $1::uuid AND created_at >= $2::timestamptz AND created_at <= $3::timestamptz
   GROUP BY hour
   ORDER BY hour`,
      userId,
      startDate.toISOString(),
      endDate.toISOString(),
      timeZone,
    );
    return rows.map((r: any) => ({ hour: Number(r.hour ?? 0), count: Number(r.cnt ?? 0) }));
  }

  // Variants that accept multiple user ids (caregiver case)
  async getSeverityCountsByUserIds(
    userIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<{
    danger: number;
    warning: number;
    suspect: number;
    unknowns: number;
    normal: number;
  }> {
    if (userIds.length === 0) return { danger: 0, warning: 0, suspect: 0, unknowns: 0, normal: 0 };
    const idList = userIds.map((id) => `'${id}'::uuid`).join(',');
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT
        COALESCE(COUNT(*) FILTER (WHERE lower(status::text) = 'danger'),0) as danger,
        COALESCE(COUNT(*) FILTER (WHERE lower(status::text) = 'warning'),0) as warning,
        COALESCE(COUNT(*) FILTER (WHERE lower(status::text) = 'suspect'),0) as suspect,
        COALESCE(COUNT(*) FILTER (WHERE lower(status::text) = 'unknowns'),0) as unknowns,
        COALESCE(COUNT(*) FILTER (WHERE status IS NULL OR lower(status::text) NOT IN ('danger','warning','suspect','unknowns')),0) as normal
    FROM event_detections
    WHERE user_id IN (${idList}) AND created_at >= $1::timestamptz AND created_at <= $2::timestamptz`,
      startDate.toISOString(),
      endDate.toISOString(),
    );
    const r = rows[0] ?? { danger: 0, warning: 0, suspect: 0, unknowns: 0, normal: 0 };
    return {
      danger: Number(r.danger || 0),
      warning: Number(r.warning || 0),
      suspect: Number(r.suspect || 0),
      unknowns: Number(r.unknowns || 0),
      normal: Number(r.normal || 0),
    } as any;
  }

  async getResolvedCountsByUserIds(
    userIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<{ resolved_true: number; resolved_false: number }> {
    if (userIds.length === 0) return { resolved_true: 0, resolved_false: 0 };
    const idList = userIds.map((id) => `'${id}'::uuid`).join(',');
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT
        COALESCE(COUNT(*) FILTER (WHERE confirm_status = true),0) as resolved_true,
        COALESCE(COUNT(*) FILTER (WHERE dismissed_at IS NOT NULL),0) as resolved_false
    FROM event_detections
    WHERE user_id IN (${idList}) AND created_at >= $1::timestamptz AND created_at <= $2::timestamptz`,
      startDate.toISOString(),
      endDate.toISOString(),
    );
    const r = rows[0] ?? { resolved_true: 0, resolved_false: 0 };
    return {
      resolved_true: Number(r.resolved_true || 0),
      resolved_false: Number(r.resolved_false || 0),
    };
  }

  async getTopEventTypeByUserIds(
    userIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<{ type: string | null; count: number }> {
    if (userIds.length === 0) return { type: null, count: 0 };
    const idList = userIds.map((id) => `'${id}'::uuid`).join(',');
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT event_type::text as type, COUNT(*) as cnt FROM event_detections
   WHERE user_id IN (${idList}) AND created_at >= $1::timestamptz AND created_at <= $2::timestamptz
   GROUP BY event_type::text
   ORDER BY cnt DESC LIMIT 1`,
      startDate.toISOString(),
      endDate.toISOString(),
    );
    const r = rows[0];
    if (!r) return { type: null, count: 0 };
    return { type: r.type ?? null, count: Number(r.cnt || 0) };
  }

  async getHourlyCountsByUserIds(
    userIds: string[],
    startDate: Date,
    endDate: Date,
    timeZone: string,
  ): Promise<Array<{ hour: number; count: number }>> {
    if (userIds.length === 0) return [];
    const idList = userIds.map((id) => `'${id}'::uuid`).join(',');
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT EXTRACT(hour FROM created_at AT TIME ZONE $4) as hour, COUNT(*) as cnt
        FROM event_detections
        WHERE user_id IN (${idList}) AND created_at >= $1::timestamptz AND created_at <= $2::timestamptz
        GROUP BY hour
        ORDER BY hour`,
      startDate.toISOString(),
      endDate.toISOString(),
      timeZone,
    );
    return rows.map((r: any) => ({ hour: Number(r.hour ?? 0), count: Number(r.cnt ?? 0) }));
  }

  async getOpenDangerCount(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT COALESCE(COUNT(*),0) as cnt FROM event_detections
        WHERE user_id = $1::uuid AND created_at >= $2::timestamptz AND created_at <= $3::timestamptz
          AND lower(status::text) = 'danger' AND verified_at IS NULL AND dismissed_at IS NULL`,
      userId,
      startDate.toISOString(),
      endDate.toISOString(),
    );
    return Number(rows[0]?.cnt ?? 0);
  }

  async getOpenDangerCountByUserIds(
    userIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    if (userIds.length === 0) return 0;
    const idList = userIds.map((id) => `'${id}'::uuid`).join(',');
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT COALESCE(COUNT(*),0) as cnt FROM event_detections
        WHERE user_id IN (${idList}) AND created_at >= $1::timestamptz AND created_at <= $2::timestamptz
          AND lower(status::text) = 'danger' AND verified_at IS NULL AND dismissed_at IS NULL`,
      startDate.toISOString(),
      endDate.toISOString(),
    );
    return Number(rows[0]?.cnt ?? 0);
  }

  // Service interface methods
  async findByRange(userId: string, start: Date, end: Date): Promise<events[]> {
    return this.findByUserIdAndDateRange(userId, start, end);
  }

  async findAlertsByUserPaginated(
    _userId: string,
    _filters: any,
    _page?: number,
    _limit?: number,
    _orderBy?: string,
    _order?: string,
  ): Promise<{ data: any[]; total: number }> {
    const page = Math.max(1, _page ?? 1);
    const limit = Math.max(1, Math.min(200, _limit ?? 10));
    const skip = (page - 1) * limit;

    const where: Prisma.eventsWhereInput = { user_id: _userId };

    if (_filters) {
      const { event_type, status, lifecycle_state, startDate, endDate } = _filters;
      if (event_type)
        where.event_type = Array.isArray(event_type) ? { in: event_type } : event_type;
      if (status) where.status = Array.isArray(status) ? { in: status } : status;
      if (lifecycle_state)
        where.lifecycle_state = Array.isArray(lifecycle_state)
          ? { in: lifecycle_state }
          : lifecycle_state;
      this.attachDateRange(where, 'created_at', startDate, endDate);
    }

    const orderBy: any = {};
    const ob = _orderBy || 'created_at';
    const ord = (_order || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    orderBy[ob] = ord;

    const [data, total] = await Promise.all([
      this.prisma.events.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          cameras: true,
          snapshots: {
            include: {
              files: { select: { cloud_url: true }, orderBy: { created_at: 'desc' }, take: 1 },
            },
          },
        },
      }),
      this.prisma.events.count({ where }),
    ]);

    return { data: data as unknown as any[], total };
  }

  // Previously named `summaryBySeverity`. Renamed to `summaryByStatusSummary`
  // to avoid confusion with `summaryByStatus` (which groups raw status
  // strings). This returns severity-like buckets derived from the `status`
  // column (danger/warning/suspect/unknowns/normal).
  async summaryByStatusSummary(_userId: string, _filters?: any): Promise<any[]> {
    const startDate = _filters?.startDate ? new Date(_filters.startDate) : undefined;
    const endDate = _filters?.endDate ? new Date(_filters.endDate) : undefined;

    const counts = await this.getSeverityCounts(
      _userId,
      startDate ?? new Date(0),
      endDate ?? new Date(),
    );
    // Return buckets including the newly-added enum values 'suspect' and 'unknowns'.
    return [
      { severity: 'danger', count: counts.danger },
      { severity: 'warning', count: counts.warning },
      { severity: 'suspect', count: (counts as any).suspect ?? 0 },
      { severity: 'unknowns', count: (counts as any).unknowns ?? 0 },
      { severity: 'normal', count: counts.normal },
    ];
  }

  // NOTE: The old `summaryBySeverity` wrapper was removed to clean the API.
  // Use `summaryByStatusSummary(userId, filters)` for severity-like buckets
  // (danger/warning/suspect/unknowns/normal). If any callers still reference
  // `summaryBySeverity`, update them to call `summaryByStatusSummary`.

  async summaryByStatus(_userId: string, _filters?: any): Promise<any[]> {
    // Return counts grouped by status string (e.g., 'danger','warning', null/others)
    const where: any = { user_id: _userId };
    if (_filters) {
      this.attachDateRange(where, 'detected_at', _filters.startDate, _filters.endDate);
    }

    const args: any[] = [_userId];
    let sql = `SELECT COALESCE(status::text,'__none__') AS status_text, COUNT(*)::int AS cnt
       FROM event_detections
       WHERE user_id = $1::uuid`;

    if (where.detected_at && where.detected_at.gte) {
      args.push(new Date(where.detected_at.gte).toISOString());
      sql += ` AND detected_at >= $${args.length}::timestamptz`;
    }
    if (where.detected_at && where.detected_at.lte) {
      args.push(new Date(where.detected_at.lte).toISOString());
      sql += ` AND detected_at <= $${args.length}::timestamptz`;
    }

    sql += ` GROUP BY status_text ORDER BY cnt DESC`;

    const rows: any[] = await this.prisma.$queryRawUnsafe(sql, ...args);

    return rows.map((r: any) => ({
      status: r.status_text === '__none__' ? null : r.status_text,
      count: Number(r.cnt),
    }));
  }

  async countEventDetections(where?: Prisma.eventsWhereInput): Promise<number> {
    return this.prisma.events.count({ where });
  }

  /**
   * Count event detections grouped by user_id for a set of users.
   * Returns a map: { [user_id]: count }
   */
  async countEventDetectionsGroupedByUserIds(
    userIds: string[],
    dateFrom?: Date,
  ): Promise<Record<string, number>> {
    if (!Array.isArray(userIds) || userIds.length === 0) return {};

    const where: any = { user_id: { in: userIds } };
    if (dateFrom) where.detected_at = { gte: dateFrom };

    const rows: any[] = await this.prisma.events.groupBy({
      by: ['user_id'],
      where,
      _count: { _all: true },
    } as any);

    const map: Record<string, number> = {};
    for (const r of rows) {
      map[r.user_id] = Number(r._count?._all ?? 0);
    }
    return map;
  }
}
