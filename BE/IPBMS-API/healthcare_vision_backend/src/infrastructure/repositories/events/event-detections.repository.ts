import { Injectable } from '@nestjs/common';
import { parseISOToDate } from '../../../shared/utils';
import { Prisma } from '@prisma/client';
import type { EventDetection } from '../../../core/entities/event-detections.entity';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

function buildCreateData(d: Partial<EventDetection>): Prisma.eventsCreateInput {
  const out: any = {
    user_id: d.user_id!,
    camera_id: d.camera_id!,
    event_type: d.event_type as any,
    status: (d.status as any) ?? 'normal',
    detected_at: d.detected_at ?? new Date(),
  };

  if (d.snapshot_id) out.snapshot_id = d.snapshot_id;
  if (d.notes !== undefined && d.notes !== null) out.notes = d.notes; // 👈 THÊM DÒNG NÀY

  const ctx = (d as any).context_data ?? (d as any).metadata;
  if (ctx !== undefined && ctx !== null && ctx !== '') {
    out.context_data = ctx as Prisma.InputJsonValue;
  }

  // tuyệt đối KHÔNG set lifecycle_state ở đây
  return out;
}

function buildUpdateData(d: Partial<EventDetection>): Prisma.eventsUpdateInput {
  const out: any = {};
  if (d.ai_analysis_result !== undefined) out.ai_analysis_result = d.ai_analysis_result as any;
  if (d.bounding_boxes !== undefined) out.bounding_boxes = d.bounding_boxes as any;
  if (d.confidence_score !== undefined) out.confidence_score = d.confidence_score as any;
  if (d.reliability_score !== undefined) out.reliability_score = d.reliability_score as any;

  // cập nhật thêm nếu bạn muốn:
  if (d.snapshot_id) out.snapshot_id = d.snapshot_id;
  const ctx = (d as any).context_data;
  if (ctx !== undefined && ctx !== null && ctx !== '')
    out.context_data = ctx as Prisma.InputJsonValue;
  if (d.notes !== undefined) out.notes = d.notes;
  return out;
}

@Injectable()
export class EventDetectionsRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async findEventById(event_id: string): Promise<EventDetection | null> {
    return super.findById<EventDetection>('events', event_id);
  }

  async createEvent(data: Partial<EventDetection>): Promise<EventDetection> {
    if (!data.event_id) {
      return (await this.prisma.events.create({
        data: buildCreateData(data),
      })) as unknown as EventDetection;
    }

    return (await this.prisma.events.upsert({
      where: { event_id: data.event_id },
      create: buildCreateData(data),
      update: buildUpdateData(data),
    })) as unknown as EventDetection;
  }

  async createEventWithSnapshot(
    eventData: Partial<EventDetection>,
    snapshotData: {
      snapshot_id: string;
      camera_id: string;
      metadata?: any;
      processed_at?: Date;
    },
  ): Promise<EventDetection> {
    return this.prisma.$transaction(async (tx) => {
      const snapshot = await tx.snapshots.create({
        data: {
          snapshot_id: snapshotData.snapshot_id,
          camera_id: snapshotData.camera_id,
          metadata: snapshotData.metadata,
          processed_at: snapshotData.processed_at || new Date(),
        },
      });

      const event = await tx.events.create({
        data: {
          ...eventData,
          snapshot_id: snapshot.snapshot_id,
          detected_at: eventData.detected_at || new Date(),
          status: eventData.status || 'normal',
        } as any,
      });

      return event as EventDetection;
    });
  }

  async updateEvent(
    event_id: string,
    data: Partial<EventDetection>,
  ): Promise<EventDetection | null> {
    return super.updateRecord<EventDetection>('events', event_id, data);
  }

  async removeEvent(event_id: string): Promise<{ deleted: boolean }> {
    try {
      await super.hardDelete<EventDetection>('events', event_id);
      return { deleted: true };
    } catch {
      return { deleted: false };
    }
  }

  /**
   * Update confirm_status for an event with optional notes
   * @param event_id - Event UUID
   * @param confirm_status - true = confirmed, false = rejected
   * @param notes - Optional notes
   * @param user_id - User performing the action (for acknowledged_by)
   */
  async updateConfirmStatus(
    event_id: string,
    confirm_status: boolean,
    notes?: string,
    user_id?: string,
  ): Promise<EventDetection> {
    const updateData: any = {
      confirm_status,
      notes: notes ?? null,
    };

    // Set acknowledged_at and acknowledged_by when confirming
    if (confirm_status) {
      updateData.acknowledged_at = new Date();
      if (user_id) {
        updateData.acknowledged_by = user_id;
      }
    }

    const result = await this.prisma.events.update({
      where: { event_id },
      data: updateData,
    });

    return result as EventDetection;
  }

  async listEvents(
    camera_id: string,
    params: {
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
  ): Promise<{ data: EventDetection[]; total: number; page: number; limit: number }> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 200) : 50;
    const offset = (page - 1) * limit;

    const where: Prisma.eventsWhereInput = { camera_id };

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (params.dateFrom) {
      const d = parseISOToDate(params.dateFrom);
      if (d) dateFilter.gte = d;
    }
    if (params.dateTo) {
      const d = parseISOToDate(params.dateTo);
      if (d) dateFilter.lte = d;
    }
    if (Object.keys(dateFilter).length > 0) where.detected_at = dateFilter;

    if (params.type?.length) where.event_type = { in: params.type as any };
    if (params.status?.length) where.status = { in: params.status as any };
    if (params.severity?.length) {
      where.ai_analysis_result = {
        path: ['severity'],
        string_contains: params.severity.join(','),
      };
    }

    const orderBy: Prisma.eventsOrderByWithRelationInput = {};
    const orderByField = params.orderBy || 'detected_at';
    const order = params.order === 'ASC' ? 'asc' : 'desc';
    if (orderByField === 'detected_at') orderBy.detected_at = order;
    else if (orderByField === 'confidence_score') orderBy.confidence_score = order;

    const [data, total] = await Promise.all([
      this.prisma.events.findMany({ where, skip: offset, take: limit, orderBy }),
      this.prisma.events.count({ where }),
    ]);

    return { data: data as EventDetection[], total, page, limit };
  }

  async bulkCreateEvents(events: Partial<EventDetection>[]): Promise<EventDetection[]> {
    const uniqueEvents = events.filter(
      (e, i, arr) => arr.findIndex((e2) => e2.event_id === e.event_id) === i,
    );

    return this.prisma.events.createManyAndReturn({
      data: uniqueEvents
        .filter((e) => e.event_id && e.snapshot_id && e.user_id && e.camera_id)
        .map((e) => ({
          event_id: e.event_id!,
          snapshot_id: e.snapshot_id!,
          user_id: e.user_id!,
          camera_id: e.camera_id!,
          event_type: e.event_type || 'fall',
          detected_at: e.detected_at || new Date(),
          status: e.status || 'normal',
          confidence_score: e.confidence_score,
          reliability_score: e.reliability_score,
          event_description: e.event_description,
          detection_data: e.detection_data,
          ai_analysis_result: e.ai_analysis_result,
          bounding_boxes: e.bounding_boxes,
          context_data: e.context_data,
          verified_at: e.verified_at,
          verified_by: e.verified_by,
          acknowledged_at: e.acknowledged_at,
          acknowledged_by: e.acknowledged_by,
          dismissed_at: e.dismissed_at,
          confirm_status: e.confirm_status,
          notes: e.notes,
        })),
      skipDuplicates: true,
    }) as Promise<EventDetection[]>;
  }

  /**
   * Fetch event detections between start..end (inclusive start, exclusive end)
   * and corresponding patient_habits for unique user_ids found in events.
   *
   * This mirrors the higher-level behavior previously implemented in the service
   * but keeps DB query logic inside the repository.
   */
  async fetchEventsAndPatientHabits(params: {
    start: Date;
    end: Date;
    limit?: number;
    offset?: number;
    page?: number;
    eventFields?: string[]; // empty or ['all'] means all fields
    habitFields?: string[]; // empty or ['all'] means all fields
  }): Promise<{
    'event-detections': Array<Record<string, any>>;
    'patient-habits': Array<Record<string, any>>;
    meta: Record<string, any>;
  }> {
    const { start, end } = params;
    const limit = params.limit ?? 1000;
    const page = params.page && params.page > 0 ? params.page : 1;
    const offset = params.offset ?? (page - 1) * limit;

    const defaultEventFields = [
      'event_id',
      'user_id',
      'camera_id',
      'snapshot_id',
      'detected_at',
      'event_type',
      'event_description',
      'confidence_score',
      'ai_analysis_result',
      'detection_data',
      'bounding_boxes',
      'context_data',
      'status',
      'notes',
    ];

    const defaultHabitFields = [
      'habit_id',
      'user_id',
      'habit_name',
      'habit_type',
      'sleep_start',
      'sleep_end',
      'frequency',
    ];

    const requestedEventFields =
      params.eventFields && params.eventFields.length > 0 ? params.eventFields : defaultEventFields;
    const wantsAllEvents = requestedEventFields.length === 1 && requestedEventFields[0] === 'all';
    // Allowed fields (schema-driven) that clients may request. We include a wide
    // superset of events columns from prisma/schema.prisma.
    const allowedEventFields = defaultEventFields.concat([
      'verified_at',
      'verified_by',
      'acknowledged_at',
      'acknowledged_by',
      'dismissed_at',
      'created_at',
      'confirm_status',
      'confirmation_state',
      'pending_until',
      'proposed_status',
      'proposed_by',
      'previous_status',
      'pending_reason',
      'event_id',
    ]);

    const finalEventFields = wantsAllEvents
      ? null
      : requestedEventFields.filter((f) => allowedEventFields.includes(f));

    // Ensure `user_id` is always selected for events so repository can fetch patient_habits
    // even when client requests a custom subset of fields that omits it.
    const finalEventFieldsEnsured =
      finalEventFields && Array.isArray(finalEventFields)
        ? Array.from(new Set([...finalEventFields, 'user_id']))
        : finalEventFields;

    const requestedHabitFields =
      params.habitFields && params.habitFields.length > 0 ? params.habitFields : defaultHabitFields;
    const wantsAllHabits = requestedHabitFields.length === 1 && requestedHabitFields[0] === 'all';
    const finalHabitFields = wantsAllHabits
      ? null
      : requestedHabitFields.filter((f) =>
          defaultHabitFields.concat(['created_at', 'updated_at', 'notes']).includes(f),
        );

    // Ensure `habit_id` is always selected for patient_habits so deduplication can rely on it.
    const finalHabitFieldsEnsured =
      finalHabitFields && Array.isArray(finalHabitFields)
        ? Array.from(new Set([...finalHabitFields, 'habit_id']))
        : finalHabitFields;

    const eventSelect: Prisma.eventsSelect | undefined = wantsAllEvents
      ? undefined
      : finalEventFieldsEnsured
        ? (finalEventFieldsEnsured.reduce(
            (acc, f) => ({ ...acc, [f]: true }),
            {},
          ) as Prisma.eventsSelect)
        : undefined;

    const events = (await this.prisma.events.findMany({
      where: { detected_at: { gte: start, lt: end } },
      orderBy: { detected_at: 'asc' },
      ...(eventSelect ? { select: eventSelect } : {}),
      take: limit,
      skip: offset,
    })) as Array<Record<string, any>>;

    const userIds = Array.from(new Set(events.map((r) => (r as any).user_id).filter(Boolean)));

    let habits: Array<Record<string, any>> = [];
    if (userIds.length > 0) {
      const habitSelect: Prisma.patient_habitsSelect | undefined = wantsAllHabits
        ? undefined
        : finalHabitFieldsEnsured
          ? (finalHabitFieldsEnsured.reduce(
              (acc, f) => ({ ...acc, [f]: true }),
              {},
            ) as Prisma.patient_habitsSelect)
          : undefined;

      const CHUNK_SIZE = 500;
      if (userIds.length <= CHUNK_SIZE) {
        habits = (await this.prisma.patient_habits.findMany({
          where: { user_id: { in: userIds } } as unknown as any,
          ...(habitSelect ? { select: habitSelect } : {}),
        })) as Array<Record<string, any>>;
      } else {
        const map = new Map<string, any>();
        for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
          const batch = userIds.slice(i, i + CHUNK_SIZE);
          const res = (await this.prisma.patient_habits.findMany({
            where: { user_id: { in: batch } } as unknown as any,
            ...(habitSelect ? { select: habitSelect } : {}),
          })) as Array<Record<string, any>>;
          for (const h of res) {
            const id = (h as any).habit_id || JSON.stringify(h);
            if (!map.has(id)) map.set(id, h);
          }
        }
        habits = Array.from(map.values());
      }
    }

    const result = {
      'event-detections': events,
      'patient-habits': habits,
      meta: {
        start: start.toISOString(),
        end: end.toISOString(),
        eventsCount: events.length,
        habitsCount: habits.length,
        page,
        limit,
      },
    };

    return result;
  }

  async updatePartial(
    event_id: string,
    patch: { notes?: string; status?: any; context_data?: Prisma.InputJsonValue },
  ): Promise<void> {
    const data: Prisma.eventsUpdateInput = {};
    if (patch.notes !== undefined) data.notes = patch.notes;
    if (patch.status !== undefined) data.status = patch.status as any;
    if (patch.context_data !== undefined) data.context_data = patch.context_data;

    await this.prisma.events.update({ where: { event_id }, data });
  }
}
