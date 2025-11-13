import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as moment from 'moment-timezone';
import * as path from 'path';
import { EventDetection } from '../../../core/entities/event-detections.entity';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EventDetectionsRepository } from '../../../infrastructure/repositories/events/event-detections.repository';
import { EventAuditLogService } from './event-audit-log.service';

@Injectable()
export class EventDetectionsService {
  private readonly logger = new Logger(EventDetectionsService.name);

  constructor(
    private readonly _eventDetectionsRepo: EventDetectionsRepository,
    private readonly _prisma: PrismaService,
    @Optional() private readonly _eventHistoryService?: EventAuditLogService,
  ) {}

  /**
   * Create event together with a snapshot record in a single transaction.
   * This delegates to repository.createEventWithSnapshot which performs the
   * DB transaction. snapshotData can omit snapshot_id to let DB generate it.
   */
  async createEventWithSnapshot(
    eventData: Partial<EventDetection>,
    snapshotData: { snapshot_id?: string; camera_id: string; metadata?: any; processed_at?: Date },
  ): Promise<EventDetection> {
    const sid = snapshotData.snapshot_id ?? randomUUID();
    return this._eventDetectionsRepo.createEventWithSnapshot(eventData, {
      snapshot_id: sid,
      camera_id: snapshotData.camera_id,
      metadata: snapshotData.metadata,
      processed_at: snapshotData.processed_at,
    });
  }

  /** Attach an existing snapshot to an existing event by setting snapshot_id
   * Returns the updated event. Uses Prisma directly to avoid allowed-update filtering.
   */
  async attachSnapshotToEvent(event_id: string, snapshot_id: string): Promise<EventDetection> {
    if (!this._prisma) {
      // Fallback to repository updateEvent which uses Prisma internally
      return (await this._eventDetectionsRepo.updateEvent(event_id, {
        snapshot_id,
      })) as EventDetection;
    }
    const updated = await this._prisma.events.update({
      where: { event_id },
      data: { snapshot_id },
    });
    return updated as EventDetection;
  }

  protected get eventHistoryService(): EventAuditLogService | undefined {
    return this._eventHistoryService;
  }

  async listEvents(
    camera_id: string,
    user_id: string,
    params?: {
      page?: number;
      limit?: number;
      dateFrom?: string;
      dateTo?: string;
      status?: string[];
      type?: string[];
      severity?: Array<'low' | 'medium' | 'high' | 'critical'>;
      orderBy?: 'detected_at' | 'confidence_score';
      order?: 'ASC' | 'DESC';
    },
  ): Promise<any> {
    // Authorization: Check if user owns camera or is caregiver
    const camera = await this._prisma.cameras.findUnique({ where: { camera_id } });
    if (!camera) throw new BadRequestException('Camera not found');

    const isOwner = camera.user_id === user_id;
    const assignments = await this._prisma.caregiver_invitations.findMany({
      where: { caregiver_id: user_id, is_active: true },
      select: { customer_id: true },
    });
    const isCaregiver = assignments.some((a) => a.customer_id === camera.user_id);

    if (!isOwner && !isCaregiver) {
      throw new ForbiddenException('Unauthorized to view events');
    }

    return this._eventDetectionsRepo.listEvents(camera_id, params || {});
  }

  async getEventById(event_id: string, user_id: string): Promise<EventDetection | null> {
    const event = await this._eventDetectionsRepo.findEventById(event_id);
    if (!event) return null;

    // Authorization check similar to listEvents
    const camera = await this._prisma.cameras.findUnique({ where: { camera_id: event.camera_id } });
    if (!camera) throw new BadRequestException('Camera not found');

    const isOwner = camera.user_id === user_id;
    const assignments = await this._prisma.caregiver_invitations.findMany({
      where: { caregiver_id: user_id, is_active: true },
      select: { customer_id: true },
    });
    const isCaregiver = assignments.some((a) => a.customer_id === camera.user_id);

    if (!isOwner && !isCaregiver) {
      throw new ForbiddenException('Unauthorized to view this event');
    }

    return event;
  }

  async createEvent(data: Partial<EventDetection>): Promise<EventDetection> {
    const normalized: any = { ...(data as any) };
    const meta = (data as any)?.metadata;
    const ctx = (data as any)?.context_data;
    if (meta && !ctx) {
      normalized.context_data = { ...(meta ?? {}) };
    } else if (meta && ctx) {
      // merge but prefer explicit context_data keys
      normalized.context_data = { ...(meta ?? {}), ...(ctx ?? {}) };
    }

    // If a trigger marker exists, log it for observability
    const trigger = normalized.context_data?.trigger;
    if (trigger) this.logger.debug(`[createEvent] detected trigger=${trigger}`);

    return this._eventDetectionsRepo.createEvent(normalized);
  }

  async updateEvent(
    event_id: string,
    data: Partial<EventDetection>,
    user_id: string,
  ): Promise<EventDetection | null> {
    // Authorization: Similar to getEventById
    const event = await this.getEventById(event_id, user_id);
    if (!event) return null;

    // Business rule: if event was already confirmed by customer, caregivers (non-owners)
    // should not be able to modify it. Owners (event.user_id) retain ability to update.
    try {
      const confirmationState = (event as any).confirmation_state;
      const ownerId = (event as any).user_id;
      if (confirmationState === 'CONFIRMED_BY_CUSTOMER' && ownerId !== user_id) {
        throw new ForbiddenException(
          'Sự kiện đã được khách hàng xác nhận; bạn không có quyền thay đổi sự kiện này.',
        );
      }
    } catch {
      // swallow and continue if event shape doesn't include confirmation_state
    }

    // Allow update only safe fields
    const allowedUpdates = [
      'status',
      'verified_by',
      'verified_at',
      'acknowledged_by',
      'acknowledged_at',
      'dismissed_at',
      'notes',
    ];
    const filteredData = Object.keys(data).reduce((acc, key) => {
      if (allowedUpdates.includes(key))
        acc[key as keyof EventDetection] = data[key as keyof EventDetection];
      return acc;
    }, {} as Partial<EventDetection>);

    // If no history service is available, fallback to previous behaviour
    if (!this.eventHistoryService) {
      const updated = await this._eventDetectionsRepo.updateEvent(event_id, filteredData);
      return updated;
    }

    // When history service is present, perform update and audit in a transaction
    try {
      const updated = await this._prisma.$transaction(async (tx: any) => {
        // Apply update using tx client
        const updatedRow = await tx.events.update({
          where: { event_id },
          data: filteredData as any,
        });

        // Build a comprehensive history entry containing changed fields
        const changedFields: Record<string, { previous: any; next: any }> = {};
        for (const k of Object.keys(filteredData)) {
          const prev = (event as any)[k];
          const next = (filteredData as any)[k];
          if (prev !== next) changedFields[k] = { previous: prev ?? null, next: next ?? null };
        }

        const historyEntry: any = {
          eventId: event_id,
          action: 'edited',
          actorId: user_id || undefined,
          actorName: undefined,
          actorRole: undefined,
          previousStatus: event.status,
          newStatus: (updatedRow as any).status || null,
          reason: undefined,
          metadata: {
            changed: changedFields,
            note: (filteredData as any).notes || null,
          },
        };

        // Pass transaction client to ensure atomicity (will rollback if insert fails)
        await this.eventHistoryService!.recordAuditLog(historyEntry, tx);

        return updatedRow as EventDetection;
      });

      return updated;
    } catch (err) {
      // If transaction failed, surface error so caller is aware logging/update didn't persist
      this.logger.error(
        `Failed to update event ${event_id} and record audit log: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    }
  }

  async deleteEvent(event_id: string, user_id: string): Promise<{ deleted: boolean }> {
    const event = await this.getEventById(event_id, user_id);
    if (!event) return { deleted: false };

    return this._eventDetectionsRepo.removeEvent(event_id);
  }

  /**
   * Update confirm_status for an event
   * @param event_id - Event UUID
   * @param confirm_status - true = confirmed, false = rejected
   * @param notes - Optional notes about the confirmation/rejection
   * @param user_id - User ID performing the action
   * @returns Updated event with confirm_status
   */
  async updateConfirmStatus(
    event_id: string,
    confirm_status: boolean,
    notes: string | undefined,
    user_id: string,
  ): Promise<EventDetection> {
    // Authorization check
    const event = await this.getEventById(event_id, user_id);
    if (!event) {
      throw new BadRequestException('Event not found or unauthorized');
    }

    // If we have eventHistoryService, perform update + audit transactionally
    if (this.eventHistoryService) {
      if (!this._prisma) {
        // Fallback: perform update and best-effort audit
        const updated = await this._eventDetectionsRepo.updateConfirmStatus(
          event_id,
          confirm_status,
          notes,
          user_id,
        );
        try {
          const historyEntry: any = {
            eventId: event_id,
            action: 'edited',
            actorId: user_id || undefined,
            previousStatus: event.status,
            newStatus: updated.confirm_status ? 'confirmed' : 'unconfirmed',
            metadata: { notes: notes || null },
          };
          await this.eventHistoryService.recordAuditLog(historyEntry).catch(() => {});
        } catch {}
        this.logger.log(
          `[updateConfirmStatus] Event ${event_id} confirm_status updated to ${confirm_status} by user ${user_id}`,
        );
        return updated;
      }

      try {
        const updated = await this._prisma.$transaction(async (tx: any) => {
          const result = await tx.events.update({
            where: { event_id },
            data: { confirm_status: confirm_status, notes: notes ?? null },
          });

          const historyEntry: any = {
            eventId: event_id,
            action: 'edited',
            actorId: user_id || undefined,
            previousStatus: event.status,
            newStatus: result.confirm_status ? 'confirmed' : 'unconfirmed',
            metadata: { notes: notes || null },
          };

          await this.eventHistoryService!.recordAuditLog(historyEntry, tx);
          return result as EventDetection;
        });

        this.logger.log(
          `[updateConfirmStatus] Event ${event_id} confirm_status updated to ${confirm_status} by user ${user_id}`,
        );

        return updated;
      } catch (err) {
        this.logger.error(
          `[updateConfirmStatus] Failed to update and record audit for event ${event_id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        throw err;
      }
    }

    // No history service => simple update
    const updated = await this._eventDetectionsRepo.updateConfirmStatus(
      event_id,
      confirm_status,
      notes,
      user_id,
    );

    this.logger.log(
      `[updateConfirmStatus] Event ${event_id} confirm_status updated to ${confirm_status} by user ${user_id}`,
    );

    return updated;
  }

  /**
   * Fetch events from 12:00 (noon) previous day to 12:00 (noon) of given endDate (or today)
   * and return unique user_ids' patient_habits
   */
  async fetchEventsAndPatientHabits(
    endDateIso?: string,
    options?: {
      limit?: number;
      page?: number;
      eventFields?: string[];
      habitFields?: string[];
      saveToFile?: boolean;
      filename?: string;
    },
  ) {
    const TZ = 'Asia/Ho_Chi_Minh';
    const endMoment = endDateIso ? moment.tz(endDateIso, TZ) : moment.tz(new Date(), TZ);
    const endNoon = endMoment.clone().hour(12).minute(0).second(0).millisecond(0);
    const startNoon = endNoon.clone().subtract(24, 'hours');
    const end = endNoon.toDate();
    const start = startNoon.toDate();

    const limit = options?.limit ?? 1000;
    const page = options?.page && options.page > 0 ? options.page : 1;
    const offset = (page - 1) * limit;

    const eventFieldsParam =
      options?.eventFields && options.eventFields.length > 0 ? options.eventFields : undefined;
    const habitFieldsParam =
      options?.habitFields && options.habitFields.length > 0 ? options.habitFields : undefined;

    // Delegate DB-heavy work to repository
    const result = await this._eventDetectionsRepo.fetchEventsAndPatientHabits({
      start,
      end,
      limit,
      offset,
      page,
      eventFields: eventFieldsParam,
      habitFields: habitFieldsParam,
    });

    // Make a copy to return to client. We may strip internal identifiers
    // (user_id / habit_id) from the response if the client explicitly
    // requested a custom field list that omits them.
    const returnResult: any = JSON.parse(JSON.stringify(result));

    // Deduplicate event-detections by event_id to avoid returning duplicate
    // event rows in downstream consumers. Preserve first-seen order and
    // merge missing fields from later duplicates where appropriate.
    if (
      Array.isArray(returnResult['event-detections']) &&
      returnResult['event-detections'].length > 0
    ) {
      const seen = new Map<string, any>();
      for (const ev of returnResult['event-detections']) {
        const id = ev && (ev as any).event_id;
        if (!id) continue;
        if (!seen.has(id)) {
          seen.set(id, ev);
        } else {
          const existing = seen.get(id);
          // merge shallow fields: keep existing values, but fill missing ones
          for (const k of Object.keys(ev)) {
            if ((existing[k] === undefined || existing[k] === null) && ev[k] != null) {
              existing[k] = ev[k];
            }
          }
          seen.set(id, existing);
        }
      }
      const deduped = Array.from(seen.values());
      returnResult['event-detections'] = deduped;
      if (returnResult.meta && typeof returnResult.meta === 'object') {
        returnResult.meta.eventsCount = deduped.length;
      }
    }

    // If client provided eventFields but did NOT include 'user_id', strip it
    if (
      eventFieldsParam &&
      Array.isArray(eventFieldsParam) &&
      !eventFieldsParam.includes('user_id')
    ) {
      if (Array.isArray(returnResult['event-detections'])) {
        for (const e of returnResult['event-detections']) {
          if ('user_id' in e) delete e.user_id;
        }
      }
    }

    // If client provided habitFields but did NOT include 'habit_id', strip it
    if (
      habitFieldsParam &&
      Array.isArray(habitFieldsParam) &&
      !habitFieldsParam.includes('habit_id')
    ) {
      if (Array.isArray(returnResult['patient-habits'])) {
        for (const h of returnResult['patient-habits']) {
          if ('habit_id' in h) delete h.habit_id;
        }
      }
    }

    // Persist full result to disk if requested (keep full data for debugging/audit)
    if (options?.saveToFile) {
      try {
        const dataDir = path.resolve(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
        const fname =
          options.filename || `events_and_habits_${new Date().toISOString().slice(0, 10)}.json`;
        const full = path.join(dataDir, fname);
        fs.writeFileSync(full, JSON.stringify(result, null, 2), 'utf8');
        this.logger.log(`Saved event & habit data to ${full}`);
      } catch (err) {
        this.logger.error('Failed to save file', err);
      }
    }

    return returnResult;
  }

  async updatePartial(
    event_id: string,
    patch: { notes?: string; status?: any; snapshot_id?: string; context_data?: any },
  ): Promise<void> {
    return this._eventDetectionsRepo.updatePartial(event_id, patch);
  }
}
