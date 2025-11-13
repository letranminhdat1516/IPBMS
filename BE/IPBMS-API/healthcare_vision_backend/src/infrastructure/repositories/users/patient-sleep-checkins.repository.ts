import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PatientSleepCheckinsRepository {
  private readonly logger = new Logger(PatientSleepCheckinsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append-only: create a new checkin row for every checkin.
   * - dateIso may be an ISO string or Date.
   */
  async upsertDaily(
    user_id: string,
    dateIso: string | Date,
    state: string,
    meta: Record<string, any> = {},
  ): Promise<any> {
    const checkinAt = typeof dateIso === 'string' ? new Date(dateIso) : dateIso;

    type SleepCheckinCreateData = {
      user_id: string;
      checkin_at: Date;
      state: string;
      meta?: any;
      habit_id?: string | null;
      medical_history_id?: string | null;
      supplement_id?: string | null;
    };

    const createData: SleepCheckinCreateData = {
      user_id,
      checkin_at: checkinAt,
      state,
      meta: meta ?? {},
    };

    const hasOwn = Object.prototype.hasOwnProperty;
    if (hasOwn.call(meta, 'habit_id') && meta.habit_id != null) createData.habit_id = meta.habit_id;
    if (hasOwn.call(meta, 'medical_history_id') && meta.medical_history_id != null)
      createData.medical_history_id = meta.medical_history_id;
    if (hasOwn.call(meta, 'supplement_id') && meta.supplement_id != null)
      createData.supplement_id = meta.supplement_id;

    try {
      if (
        !createData.habit_id &&
        !createData.medical_history_id &&
        !createData.supplement_id &&
        hasOwn.call(meta, 'activity_log_id') &&
        meta.activity_log_id
      ) {
        try {
          const act = await (this.prisma as any).activity_logs.findUnique({
            where: { id: meta.activity_log_id },
            select: { meta: true },
          });
          const actMeta = act?.meta ?? {};
          if (
            !createData.habit_id &&
            Object.prototype.hasOwnProperty.call(actMeta, 'habit_id') &&
            actMeta.habit_id != null
          ) {
            createData.habit_id = actMeta.habit_id;
          }
          if (
            !createData.medical_history_id &&
            Object.prototype.hasOwnProperty.call(actMeta, 'medical_history_id') &&
            actMeta.medical_history_id != null
          ) {
            createData.medical_history_id = actMeta.medical_history_id;
          }
          if (
            !createData.supplement_id &&
            Object.prototype.hasOwnProperty.call(actMeta, 'supplement_id') &&
            actMeta.supplement_id != null
          ) {
            createData.supplement_id = actMeta.supplement_id;
          }
        } catch (e) {
          this.logger?.warn?.('[upsertDaily] failed to resolve activity_log meta: ' + String(e));
        }
      }
      // Use prisma client at runtime; cast the client object for the model to avoid data-cast noise
      const created = await (this.prisma as any).patient_sleep_checkins.create({
        data: createData,
      });
      return created;
    } catch (err) {
      this.logger.warn('[upsertDaily] create failed: ' + String(err));
      return null;
    }
  }

  /**
   * Find checkins for a user in a date range. `from` and `to` are inclusive and treated as dates.
   */
  async findByUserDateRange(
    user_id: string,
    from?: string | Date,
    to?: string | Date,
    opts: Record<string, any> = {},
  ): Promise<any[]> {
    const where: Record<string, any> = { user_id };

    if (from) {
      const start = typeof from === 'string' ? new Date(from) : new Date(from as Date);
      start.setUTCHours(0, 0, 0, 0);
      where.checkin_at = { ...(where.checkin_at ?? {}), gte: start };
    }

    if (to) {
      const end = typeof to === 'string' ? new Date(to) : new Date(to as Date);
      end.setUTCHours(23, 59, 59, 999);
      where.checkin_at = { ...(where.checkin_at ?? {}), lte: end };
    }

    if (opts?.state) where.state = opts.state;
    if (opts?.habit_id) where.habit_id = opts.habit_id;
    if (opts?.medical_history_id) where.medical_history_id = opts.medical_history_id;
    if (opts?.supplement_id) where.supplement_id = opts.supplement_id;
    if (opts?.source) {
      where.meta = { path: ['source'], equals: opts.source };
    }

    const sortBy = opts?.sortBy ?? 'checkin_at';
    const order: 'asc' | 'desc' = opts?.order ?? 'desc';
    const limit = Number(opts?.limit ?? 20);
    const page = Number(opts?.page ?? 1);
    const take = Math.min(100, Math.max(1, limit));
    const skip = Math.max(0, (Math.max(1, page) - 1) * take);

    const orderBy: Record<string, any> = {};
    orderBy[sortBy] = order;

    try {
      const rows = await (this.prisma as any).patient_sleep_checkins.findMany({
        where,
        orderBy,
        skip,
        take,
      });
      return rows || [];
    } catch (err) {
      this.logger.warn('[findByUserDateRange] query failed: ' + String(err));
      return [];
    }
  }
}
