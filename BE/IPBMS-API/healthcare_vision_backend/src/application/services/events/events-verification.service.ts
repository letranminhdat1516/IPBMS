import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { Prisma } from '@prisma/client';
import type { VerificationAction, EventRecord } from '../../types/events-verification.types';
import { verificationActionToHistoryAction } from '../../types/events-verification.types';

@Injectable()
export class EventsVerificationService {
  private readonly logger = new Logger(EventsVerificationService.name);

  constructor(
    private readonly _prismaService: PrismaService,
    private readonly _notificationsService: NotificationsService,
  ) {}

  /**
   * Verify an event with action: APPROVED | REJECTED | CANCELED
   */
  async verifyEvent(eventId: string, action: VerificationAction, userId?: string, notes?: string) {
    this.logger.debug(`[verifyEvent] ${eventId} -> ${action} by ${userId}`);
    const now = new Date();

    const isCanceled = action === 'CANCELED';

    const result = await this._prismaService.$transaction(async (tx: Prisma.TransactionClient) => {
      const ev: EventRecord | null = await tx.events.findUnique({ where: { event_id: eventId } });
      if (!ev) throw new Error(`Event ${eventId} not found`);

      // Update non-enum fields via Prisma update to get typed safety
      await tx.events.update({
        where: { event_id: eventId },
        // Use an any-cast here to avoid generated Prisma TS typing mismatches for underscored column names
        data: {
          ['last_action_by']: userId ?? null,
          ['last_action_at']: now,
          ['pending_since']: null,
          ['is_canceled']: isCanceled,
        } as any,
      });

      // Set verification_status using a raw query cast to enum to avoid TS/Prisma enum typing mismatch
      await tx.$executeRaw`
        UPDATE event_detections SET verification_status = ${action}::event_verification_status_enum WHERE event_id = ${eventId}::uuid
      `;

      const updated = await tx.events.findUnique({ where: { event_id: eventId } });

      // write simple audit to event_history
      const historyAction = verificationActionToHistoryAction(action);
      await tx.event_history.create({
        data: {
          event_id: eventId,
          action: historyAction as any,
          actor_id: userId ?? null,
          reason: notes ?? null,
          previous_status: (ev as any).confirmation_state ?? null,
          new_status: (updated as any).confirmation_state ?? null,
          created_at: now,
        },
      });

      return updated;
    });

    // After successful transaction, send cancellation notification(s) to stakeholders
    if (isCanceled) {
      try {
        await this._notificationsService.create({
          user_id: null,
          title: 'Sự kiện đã bị huỷ',
          body: `Event ${eventId} đã được huỷ bởi người dùng.`,
          data: { event_id: eventId, action: 'canceled' },
        } as any);
      } catch (errNoti) {
        const msg = `[verifyEvent] Failed to send cancel notification for ${eventId}: ${String(errNoti)}`;
        this.logger.error(msg);
      }
    }

    return result;
  }

  async escalateEvent(eventId: string, reason?: string) {
    this.logger.debug(`[escalateEvent] ${eventId} reason=${reason}`);
    const now = new Date();
    return this._prismaService.$transaction(async (tx: Prisma.TransactionClient) => {
      const ev: EventRecord | null = await tx.events.findUnique({ where: { event_id: eventId } });
      if (!ev) throw new Error(`Event ${eventId} not found`);

      // Increment escalation_count and set other fields via Prisma
      await tx.events.update({
        where: { event_id: eventId },
        data: {
          ['escalation_count']: { increment: 1 },
          ['escalated_at']: now,
          ['auto_escalation_reason']: reason ?? null,
        } as any,
      });

      // Set verification_status to ESCALATED via raw query (cast to enum)
      await tx.$executeRaw`
        UPDATE event_detections SET verification_status = 'ESCALATED'::event_verification_status_enum WHERE event_id = ${eventId}::uuid
      `;

      const updated = await tx.events.findUnique({ where: { event_id: eventId } });

      await tx.event_history.create({
        data: {
          event_id: eventId,
          action: 'auto_rejected' as any,
          actor_id: null,
          reason: reason ?? null,
          previous_status: (ev as any).confirmation_state ?? null,
          new_status: (updated as any).confirmation_state ?? null,
          created_at: now,
        },
      });

      return updated;
    });
  }
}
