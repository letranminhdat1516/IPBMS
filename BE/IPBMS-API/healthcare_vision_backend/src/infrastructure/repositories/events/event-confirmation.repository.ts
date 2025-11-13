import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

export interface ProposeChangeParams {
  eventId: string;
  caregiverId: string;
  newStatus: string;
  pendingUntil: Date;
  reason?: string;
  proposedEventType?: string;
}

export interface ConfirmChangeResult {
  event_id: string;
  status: string;
  event_type: string;
  proposed_status: string | null;
  proposed_event_type: string | null;
  proposed_reason: string | null;
  proposed_by: string | null;
  pending_until: Date | null;
  confirmation_state: string;
  acknowledged_by: string | null;
  acknowledged_at: Date | null;
  confirm_status: boolean | null;
  user_id: string;
  detected_at: Date;
  cameras?: {
    camera_name: string;
    location_in_room: string | null;
  };
  snapshots?: {
    files: Array<{
      cloud_url: string | null;
    }>;
  };
}

@Injectable()
export class EventConfirmationRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  /**
   * Atomically propose a change to an event's status/event_type.
   * Only succeeds if there's no active proposal already.
   * Returns the updated event or null if condition not met.
   */
  async proposeChange(params: ProposeChangeParams, tx?: any): Promise<any | null> {
    const client = tx || this.prisma;
    const { eventId, caregiverId, newStatus, pendingUntil, reason, proposedEventType } = params;

    // Perform conditional update only if there's no active proposal already
    // Only allow proposing when there is no active confirmed state by customer.
    // Allowed confirmation_state values: NULL, 'DETECTED', 'REJECTED_BY_CUSTOMER'
    // Cast string parameters to the DB enum types to avoid Postgres type errors
    const rows: any[] = proposedEventType
      ? await client.$queryRaw`
          UPDATE event_detections
          SET proposed_status = ${newStatus}::event_status_enum,
              proposed_event_type = ${proposedEventType}::event_type_enum,
              proposed_reason = ${reason ?? null},
              proposed_by = ${caregiverId}::uuid,
              pending_until = ${pendingUntil.toISOString()}::timestamptz,
              confirmation_state = 'CAREGIVER_UPDATED'
          WHERE event_id = ${eventId}::uuid
      AND (confirmation_state IS NULL 
        OR confirmation_state = 'DETECTED'
        OR confirmation_state = 'REJECTED_BY_CUSTOMER')
          RETURNING *;
        `
      : await client.$queryRaw`
          UPDATE event_detections
          SET proposed_status = ${newStatus}::event_status_enum,
              proposed_reason = ${reason ?? null},
              proposed_by = ${caregiverId}::uuid,
              pending_until = ${pendingUntil.toISOString()}::timestamptz,
              confirmation_state = 'CAREGIVER_UPDATED'
          WHERE event_id = ${eventId}::uuid
      AND (confirmation_state IS NULL 
        OR confirmation_state = 'DETECTED'
        OR confirmation_state = 'REJECTED_BY_CUSTOMER')
          RETURNING *;
        `;

    return rows?.[0] ?? null;
  }

  /**
   * Get event with full context (camera, snapshots, caregiver info)
   */
  async getEventWithContext(eventId: string, tx?: any): Promise<any | null> {
    const client = tx || this.prisma;

    return client.events.findUnique({
      where: { event_id: eventId },
      include: {
        cameras: {
          select: {
            camera_name: true,
            location_in_room: true,
          },
        },
        snapshots: {
          include: {
            files: {
              select: {
                cloud_url: true,
              },
              take: 1,
            },
          },
        },
        verified_by_user: {
          select: {
            full_name: true,
          },
        },
      },
    });
  }

  /**
   * Check if event exists
   */
  async eventExists(eventId: string, tx?: any): Promise<boolean> {
    const client = tx || this.prisma;
    const event = await client.events.findUnique({
      where: { event_id: eventId },
      select: { event_id: true },
    });
    return !!event;
  }

  /**
   * Apply proposed changes to event (confirm)
   */
  async confirmChange(
    eventId: string,
    customerId: string,
    proposedEventType: string | null,
    tx?: any,
  ): Promise<any> {
    const client = tx || this.prisma;

    // Use raw query to apply proposed_status to status
    const rows: any[] = proposedEventType
      ? await client.$queryRaw`
          UPDATE event_detections
          SET status = proposed_status::event_status_enum,
              event_type = ${proposedEventType}::event_type_enum,
              confirmation_state = 'CONFIRMED_BY_CUSTOMER',
              acknowledged_by = ${customerId}::uuid,
              acknowledged_at = NOW(),
              confirm_status = true,
              pending_until = NULL,
              proposed_status = NULL,
              proposed_event_type = NULL,
              proposed_reason = NULL
          WHERE event_id = ${eventId}::uuid
            AND confirmation_state = 'CAREGIVER_UPDATED'
          RETURNING *;
        `
      : await client.$queryRaw`
          UPDATE event_detections
          SET status = proposed_status::event_status_enum,
              confirmation_state = 'CONFIRMED_BY_CUSTOMER',
              acknowledged_by = ${customerId}::uuid,
              acknowledged_at = NOW(),
              confirm_status = true,
              pending_until = NULL,
              proposed_status = NULL,
              proposed_event_type = NULL,
              proposed_reason = NULL
          WHERE event_id = ${eventId}::uuid
            AND confirmation_state = 'CAREGIVER_UPDATED'
          RETURNING *;
        `;

    return rows && rows.length > 0 ? rows[0] : null;
  }

  /**
   * Reject proposed changes (clear proposal fields)
   */
  async rejectChange(eventId: string, customerId: string, tx?: any): Promise<any> {
    const client = tx || this.prisma;

    const rows: any[] = await client.$queryRaw`
      UPDATE event_detections
      SET confirmation_state = 'REJECTED_BY_CUSTOMER',
          acknowledged_by = ${customerId}::uuid,
          acknowledged_at = NOW(),
          confirm_status = false,
          pending_until = NULL,
          proposed_status = NULL,
          proposed_event_type = NULL,
          proposed_reason = NULL
      WHERE event_id = ${eventId}::uuid
        AND confirmation_state = 'CAREGIVER_UPDATED'
      RETURNING *;
    `;

    return rows && rows.length > 0 ? rows[0] : null;
  }

  /**
   * Auto-reject proposal (system rejects expired dangerous proposals)
   */
  async autoRejectProposal(eventId: string, tx?: any): Promise<any | null> {
    const client = tx || this.prisma;

    const rows: any[] = await client.$queryRaw`
      UPDATE event_detections
      SET confirmation_state = 'REJECTED_BY_CUSTOMER',
          acknowledged_by = NULL,
          acknowledged_at = NOW(),
          confirm_status = false,
          pending_until = NULL,
          proposed_status = NULL,
          proposed_event_type = NULL,
          proposed_reason = NULL
      WHERE event_id = ${eventId}::uuid
        AND confirmation_state = 'CAREGIVER_UPDATED'
      RETURNING *;
    `;

    return rows && rows.length > 0 ? rows[0] : null;
  }

  /**
   * Expire a proposal (treat as rejection when pending_until elapsed).
   * Sets confirmation_state = 'REJECTED_BY_CUSTOMER' and clears proposal fields.
   */
  async expireProposal(eventId: string, tx?: any): Promise<any | null> {
    const client = tx || this.prisma;

    const rows: any[] = await client.$queryRaw`
      UPDATE event_detections
      SET confirmation_state = 'REJECTED_BY_CUSTOMER',
          acknowledged_by = NULL,
          acknowledged_at = NOW(),
          confirm_status = false,
          pending_until = NULL,
          proposed_status = NULL,
          proposed_event_type = NULL,
          proposed_reason = NULL,
          proposed_by = NULL
      WHERE event_id = ${eventId}::uuid
        AND confirmation_state = 'CAREGIVER_UPDATED'
      RETURNING *;
    `;

    return rows && rows.length > 0 ? rows[0] : null;
  }

  /**
   * Cancel proposal (caregiver cancels their own proposal)
   */
  async cancelProposal(eventId: string, tx?: any): Promise<any> {
    const client = tx || this.prisma;

    const rows: any[] = await client.$queryRaw`
      UPDATE event_detections
      SET confirmation_state = 'DETECTED',
          pending_until = NULL,
          proposed_status = NULL,
          proposed_event_type = NULL,
          proposed_reason = NULL,
          proposed_by = NULL
      WHERE event_id = ${eventId}::uuid
        AND confirmation_state = 'CAREGIVER_UPDATED'
      RETURNING *;
    `;

    return rows && rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find expired proposals for auto-approval
   */
  async findExpiredProposals(limit: number = 100, tx?: any): Promise<any[]> {
    const client = tx || this.prisma;

    return client.$queryRaw`
      SELECT *
      FROM event_detections
      WHERE confirmation_state = 'CAREGIVER_UPDATED'
        AND pending_until IS NOT NULL
        AND pending_until <= NOW()
      ORDER BY pending_until ASC
      LIMIT ${limit};
    `;
  }

  /**
   * Auto-approve a single expired proposal
   *
   * DEPRECATED/LEGACY: kept for historical compatibility. The system policy
   * now treats expired proposals as rejected (silence != consent). Prefer
   * using `expireProposal` / `autoExpirePending` flow instead.
   */
  async autoApproveProposal(eventId: string, tx?: any): Promise<any | null> {
    // DEPRECATED: Historically this method auto-approved expired proposals by
    // setting confirmation_state = 'AUTO_APPROVED'. Under the new policy
    // (silence != consent) we treat expired proposals as rejected. To avoid
    // creating the removed enum value in the database, this compatibility
    // wrapper now delegates to `expireProposal`, which clears proposal fields
    // and sets confirmation_state = 'REJECTED_BY_CUSTOMER'.
    return this.expireProposal(eventId, tx);
  }

  /**
   * Get pending proposals for customer or caregiver view
   */
  async getPendingProposals(
    userId: string,
    role: 'customer' | 'caregiver',
    page: number = 1,
    limit: number = 20,
    tx?: any,
  ): Promise<{ data: any[]; total: number }> {
    const client = tx || this.prisma;
    const offset = (page - 1) * limit;

    const whereCondition =
      role === 'customer'
        ? { user_id: userId, confirmation_state: 'CAREGIVER_UPDATED' }
        : { proposed_by: userId, confirmation_state: 'CAREGIVER_UPDATED' };

    const [data, total] = await Promise.all([
      client.events.findMany({
        where: whereCondition,
        include: {
          cameras: {
            select: {
              camera_name: true,
              location_in_room: true,
            },
          },
          snapshots: {
            include: {
              files: {
                select: {
                  cloud_url: true,
                },
                take: 1,
              },
            },
          },
        },
        orderBy: { pending_until: 'asc' },
        skip: offset,
        take: limit,
      }),
      client.events.count({
        where: whereCondition,
      }),
    ]);

    return { data, total };
  }

  /**
   * Get confirmation history (all events with confirmation states)
   */
  async getConfirmationHistory(
    userId: string,
    role: 'customer' | 'caregiver',
    page: number = 1,
    limit: number = 20,
    tx?: any,
  ): Promise<{ data: any[]; total: number }> {
    const client = tx || this.prisma;
    const offset = (page - 1) * limit;

    const whereCondition =
      role === 'customer'
        ? {
            user_id: userId,
            confirmation_state: {
              // NOTE: 'AUTO_APPROVED' was a historical state. New runtime no longer uses it.
              in: ['CONFIRMED_BY_CUSTOMER', 'REJECTED_BY_CUSTOMER'],
            },
          }
        : {
            proposed_by: userId,
            confirmation_state: {
              // NOTE: 'AUTO_APPROVED' was a historical state. New runtime no longer uses it.
              in: ['CONFIRMED_BY_CUSTOMER', 'REJECTED_BY_CUSTOMER'],
            },
          };

    const [data, total] = await Promise.all([
      client.events.findMany({
        where: whereCondition,
        include: {
          cameras: {
            select: {
              camera_name: true,
              location_in_room: true,
            },
          },
        },
        orderBy: { acknowledged_at: 'desc' },
        skip: offset,
        take: limit,
      }),
      client.events.count({
        where: whereCondition,
      }),
    ]);

    return { data, total };
  }

  /**
   * Get confirmation statistics
   */
  async getConfirmationStats(
    userId: string,
    role: 'customer' | 'caregiver',
    dateFrom?: Date,
    dateTo?: Date,
    tx?: any,
  ): Promise<{
    total_proposed: number;
    confirmed: number;
    rejected: number;
    auto_approved: number;
    pending: number;
  }> {
    const client = tx || this.prisma;

    const whereBase = role === 'customer' ? { user_id: userId } : { proposed_by: userId };

    const dateFilter =
      dateFrom && dateTo
        ? {
            detected_at: {
              gte: dateFrom,
              lte: dateTo,
            },
          }
        : {};

    const [confirmed, rejected, autoApproved, pending] = await Promise.all([
      client.events.count({
        where: {
          ...whereBase,
          ...dateFilter,
          confirmation_state: 'CONFIRMED_BY_CUSTOMER',
        },
      }),
      client.events.count({
        where: {
          ...whereBase,
          ...dateFilter,
          confirmation_state: 'REJECTED_BY_CUSTOMER',
        },
      }),
      // Historical auto-approved counts are not part of runtime stats. Use
      // audit tables if you need historical numbers (migration script moves
      // historical auto-approved actions into normalized records).
      0,
      client.events.count({
        where: {
          ...whereBase,
          ...dateFilter,
          confirmation_state: 'CAREGIVER_UPDATED',
        },
      }),
    ]);

    const total = confirmed + rejected + autoApproved + pending;

    return {
      total_proposed: total,
      confirmed,
      rejected,
      auto_approved: autoApproved,
      pending,
    };
  }

  /**
   * Get user (caregiver/customer) full name
   */
  async getUserFullName(userId: string, tx?: any): Promise<string | null> {
    const client = tx || this.prisma;

    const user = await client.users.findUnique({
      where: { user_id: userId },
      select: { full_name: true },
    });

    return user?.full_name || null;
  }
}
