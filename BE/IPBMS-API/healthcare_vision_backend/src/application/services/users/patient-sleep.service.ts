import { Injectable, Logger } from '@nestjs/common';
import { PatientSleepCheckinsRepository } from '../../../infrastructure/repositories/users/patient-sleep-checkins.repository';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { patient_habits } from '@prisma/client';

/**
 * Mặc định dùng Asia/Ho_Chi_Minh. Không cần thêm lib TZ,
 * ta tự tính biên ngày theo GMT+7 để tránh lệch múi của server.
 */
const TZN = 'Asia/Ho_Chi_Minh';
const TZ_OFFSET_MS = 7 * 60 * 60 * 1000; // +07:00
const DEDUP_WINDOW_MIN = Number(process.env.SLEEP_DEDUP_WINDOW_MIN ?? 60); // ±60' (có thể set 30/90)
const MAX_AUTOFILL_DAYS = 14;

function startOfDayAtGmtPlus7(d: Date) {
  // Lấy 00:00+07 của ngày chứa d
  const utcMidnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
  return new Date(utcMidnight - TZ_OFFSET_MS);
}
function endOfDayAtGmtPlus7(d: Date) {
  const s = startOfDayAtGmtPlus7(d);
  return new Date(s.getTime() + 24 * 60 * 60 * 1000 - 1);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}
function hhmmssUTC(date: Date) {
  return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`;
}
function weekdayKey(d: Date): 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' {
  // Date.getDay(): 0=Sun..6=Sat
  const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
  return map[d.getDay()] as any;
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

@Injectable()
export class PatientSleepService {
  private readonly logger = new Logger(PatientSleepService.name);

  constructor(
    private readonly repo: PatientSleepCheckinsRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Parse 'HH:mm[:ss]' hoặc Date (UTC 1970) → trả về Date (UTC 1970..hh:mm:ss).
   * Chỉ dùng để lấy giờ/phút/giây; không so sánh theo mốc ngày thực.
   */
  private parseTimeHHMM(v?: string | Date | null): Date | null {
    if (!v) return null;
    if (v instanceof Date) return v;
    const parts = String(v).split(':');
    const hh = Number(parts[0] || 0) || 0;
    const mm = Number(parts[1] || 0) || 0;
    const ss = Number(parts[2] || 0) || 0;
    return new Date(Date.UTC(1970, 0, 1, hh, mm, ss));
  }

  /**
   * Lấy habit sleep active theo user + thứ (days_of_week là JSONB array).
   * Match khi days_of_week IS NULL hoặc JSONB array @> [w].
   */
  private async findSleepHabitByDOW(userId: string, w: string): Promise<patient_habits | null> {
    // w là 'mon' | 'tue' ...
    const probeJson = JSON.stringify([w]); // '["mon"]'

    const rows = await this.prisma.$queryRaw<patient_habits[]>`
    SELECT *
    FROM patient_habits
    WHERE user_id = CAST(${userId} AS uuid)
      AND habit_type = 'sleep'
      AND is_active = true
      AND (
        days_of_week IS NULL
        OR days_of_week @> CAST(${probeJson} AS jsonb)
      )
    ORDER BY updated_at DESC
    LIMIT 1
  `;
    return rows?.[0] ?? null;
  }

  async upsertDailyCheckin(
    userId: string,
    timestamp: string | Date,
    state: 'sleep' | 'awake' | string,
    meta: Record<string, any> = {},
  ) {
    const ts = typeof timestamp === 'string' ? timestamp : timestamp.toISOString();
    return this.repo.upsertDaily(userId, ts, state, meta);
  }

  /**
   * On-read autofill nhẹ cho khoảng from..to (tối đa 14 ngày) rồi trả lịch sử.
   */
  async getHistory(userId: string, from?: string, to?: string, opts: any = {}) {
    if (from && to) {
      const f = new Date(from);
      const t = new Date(to);
      let cur = startOfDayAtGmtPlus7(f);
      const days = Math.ceil((+endOfDayAtGmtPlus7(t) - +cur) / (24 * 60 * 60 * 1000)) + 1;
      const max = clamp(days, 0, MAX_AUTOFILL_DAYS);
      for (let i = 0; i < max; i++) {
        try {
          await this.ensureAutofillForDate(userId, cur);
        } catch (e) {
          this.logger.warn(`autofill skip ${userId} ${cur.toISOString()}: ${String(e)}`);
        }
        cur = addDays(cur, 1);
      }
    }
    return this.repo.findByUserDateRange(userId, from, to, opts);
  }

  /**
   * Tự động tạo sleep/awake cho 1 ngày theo habit:
   * - Nếu chưa có bản ghi trong ngày → chèn cả sleep & awake.
   * - Nếu đã có một phần → chèn phần thiếu (tôn trọng dedup ±N phút).
   * - Hỗ trợ habit xuyên đêm (awake rơi vào ngày +1).
   */
  async ensureAutofillForDate(userId: string, dateLocal: Date) {
    const windowMin = clamp(DEDUP_WINDOW_MIN, 0, 240); // 0..240'
    const dayStart = startOfDayAtGmtPlus7(dateLocal);
    const dayEnd = endOfDayAtGmtPlus7(dateLocal);

    // 1) Lấy các checkin trong ngày (theo +07)
    const todays = await (this.prisma as any).patient_sleep_checkins.findMany({
      where: { user_id: userId, checkin_at: { gte: dayStart, lte: dayEnd } },
      orderBy: { checkin_at: 'asc' },
    });
    const hasAny = (todays?.length ?? 0) > 0;
    const hasSleep = todays.some((r: any) => r.state === 'sleep');
    const hasAwake = todays.some((r: any) => r.state === 'awake');

    // 2) Tìm habit theo thứ (JSONB @>)
    const w = weekdayKey(dayStart);
    const habit = await this.findSleepHabitByDOW(userId, w);
    if (!habit) {
      this.logger.debug(`[${TZN}] no habit for ${userId} on ${w}`);
      return;
    }

    // 3) Parse khung giờ habit
    const s = this.parseTimeHHMM(habit.sleep_start); // UTC 1970..hh:mm:ss
    const e = this.parseTimeHHMM(habit.sleep_end);
    if (!s || !e) {
      this.logger.warn(`habit ${habit.habit_id} missing sleep_start/end`);
      return;
    }

    // 4) Dựng mốc trong ngày (+07)
    const sleepAt = new Date(dayStart);
    sleepAt.setHours(s.getUTCHours(), s.getUTCMinutes(), s.getUTCSeconds(), 0);

    let awakeAt = new Date(dayStart);
    awakeAt.setHours(e.getUTCHours(), e.getUTCMinutes(), e.getUTCSeconds(), 0);

    const crossMidnight = s.getTime() > e.getTime();
    if (crossMidnight) {
      // awake vào ngày +1 (+07)
      awakeAt = addDays(awakeAt, 1);
    }

    // 5) Dedup: đã có bản ghi “tương đương” trong ±windowMin?
    const around = async (target: Date, state: 'sleep' | 'awake') => {
      const deltaMs = windowMin * 60 * 1000;
      const a = new Date(target.getTime() - deltaMs);
      const b = new Date(target.getTime() + deltaMs);
      const rows = await (this.prisma as any).patient_sleep_checkins.findMany({
        where: { user_id: userId, state, checkin_at: { gte: a, lte: b } },
        take: 1,
      });
      return rows?.length > 0;
    };

    const meta = { source: 'habit_auto', habit_id: habit.habit_id };

    // 6) Quyết định chèn
    if (!hasAny) {
      await this.repo.upsertDaily(userId, sleepAt, 'sleep', meta);
      await this.repo.upsertDaily(userId, awakeAt, 'awake', meta);
      this.logger.debug(
        `[${TZN}] autofill both for ${userId} ` +
          `sleep=${sleepAt.toISOString()} awake=${awakeAt.toISOString()} cross=${crossMidnight}`,
      );
      return;
    }

    // Đã có một phần → chèn phần thiếu (nếu không trùng theo dedup window)
    if (!hasSleep && !(await around(sleepAt, 'sleep'))) {
      await this.repo.upsertDaily(userId, sleepAt, 'sleep', meta);
      this.logger.debug(`[${TZN}] autofill sleep ${sleepAt.toISOString()} for ${userId}`);
    }
    // awake có thể rơi ngày +1; vẫn cho phép chèn vì đó là mốc chuẩn
    if (!hasAwake && !(await around(awakeAt, 'awake'))) {
      await this.repo.upsertDaily(userId, awakeAt, 'awake', meta);
      this.logger.debug(`[${TZN}] autofill awake ${awakeAt.toISOString()} for ${userId}`);
    }
  }
}
