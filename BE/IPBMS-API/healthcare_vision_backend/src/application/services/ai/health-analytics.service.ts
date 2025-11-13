import { formatIsoLocal } from '@/shared/dates/iso-local';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { EventsRepository } from '../../../infrastructure/repositories/events/events.repository';
import { HealthQueryDto } from '../../dto/health-reports/health-query.dto';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);

type HighRiskBuckets = { morning: number; afternoon: number; evening: number; night: number };
type Severity = 'danger' | 'warning' | 'normal';

@Injectable()
export class HealthAnalyticsService {
  private readonly logger = new Logger(HealthAnalyticsService.name);
  constructor(
    private readonly _eventsRepo: EventsRepository,
    private readonly _config: ConfigService,
  ) {}

  private asBool(v: unknown): boolean {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
    if (typeof v === 'number') return v === 1;
    return false;
  }

  private getSeverity(e: any): Severity {
    const s = String(e?.status ?? 'normal').toLowerCase();
    return s === 'danger' || s === 'warning' ? (s as Severity) : 'normal';
  }

  private bucketHour(h: number): keyof HighRiskBuckets {
    if (h >= 6 && h < 12) return 'morning';
    if (h >= 12 && h < 18) return 'afternoon';
    if (h >= 18 && h < 24) return 'evening';
    return 'night';
  }

  private getRange(query: HealthQueryDto) {
    const tz = this._config.get('TIMEZONE') || 'Asia/Ho_Chi_Minh';
    const now = dayjs().tz(tz);
    const start = query.startDay ? dayjs.tz(query.startDay, tz).startOf('day') : now.startOf('day');
    const end = query.endDay ? dayjs.tz(query.endDay, tz).endOf('day') : now.endOf('day');
    return { start: start.toDate(), end: end.toDate(), tz };
  }

  async getHealthOverview(query: HealthQueryDto, userId: string, role?: string) {
    const { start, end, tz } = this.getRange(query);
    this.logger.log(
      `HealthAnalyticsService.getHealthOverview: userId=${userId}, role=${role}, start=${formatIsoLocal(
        start,
      )}, end=${formatIsoLocal(end)}`,
    );
    // Use DB aggregates to avoid loading large event sets into memory
    let severityCounts;
    let resolvedCounts;
    let hourlyCounts: Array<{ hour: number; count: number }> = [];
    let topEventType: { type: string | null; count: number } = { type: null, count: 0 };

    if (role === 'caregiver') {
      const customerIds = await this._eventsRepo.getAssignedCustomerIds(userId);
      severityCounts = await this._eventsRepo.getSeverityCountsByUserIds(customerIds, start, end);
      resolvedCounts = await this._eventsRepo.getResolvedCountsByUserIds(customerIds, start, end);
      hourlyCounts = await this._eventsRepo.getHourlyCountsByUserIds(customerIds, start, end, tz);
      topEventType = await this._eventsRepo.getTopEventTypeByUserIds(customerIds, start, end);
    } else {
      severityCounts = await this._eventsRepo.getSeverityCounts(userId, start, end);
      resolvedCounts = await this._eventsRepo.getResolvedCounts(userId, start, end);
      hourlyCounts = await this._eventsRepo.getHourlyCounts(userId, start, end, tz);
      topEventType = await this._eventsRepo.getTopEventType(userId, start, end);
    }

    const abnormal_total = (severityCounts.danger || 0) + (severityCounts.warning || 0);
    const resolvedTrue = resolvedCounts.resolved_true || 0;
    const resolvedFalse = resolvedCounts.resolved_false || 0;
    let openCriticalOverSLA = 0;

    // build buckets from hourlyCounts
    const buckets: HighRiskBuckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    for (const h of hourlyCounts) {
      buckets[this.bucketHour(h.hour)] += h.count;
    }

    const totalResolved = resolvedTrue + resolvedFalse;
    const resolved_true_rate = totalResolved > 0 ? +(resolvedTrue / totalResolved).toFixed(2) : 0;
    const top_label = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0]?.[0] || 'morning';

    return {
      range: { start_time: start.toISOString(), end_time: end.toISOString() },
      kpis: {
        abnormal_total,
        resolved_true_rate,
        avg_response_seconds: 0,
        open_critical_over_sla: openCriticalOverSLA,
      },
      high_risk_time: { ...buckets, top_label },
      top_event_type: topEventType,
      ai_summary:
        'Trong khoảng ngày đã chọn, tỷ lệ xử lý đạt ~78%, đa số bất thường diễn ra buổi tối. Không có chuỗi cảnh báo bất thường kéo dài trong đêm.',
    };
  }

  async getHealthInsight(query: HealthQueryDto, userId: string, role?: string) {
    const { start, end } = this.getRange(query);
    const days = dayjs(end).diff(dayjs(start), 'day') + 1;
    const prevStart = dayjs(start).subtract(days, 'day').toDate();
    const prevEnd = dayjs(start).subtract(1, 'day').endOf('day').toDate();

    // Fetch events for current and previous ranges (caregiver uses assigned customers)
    let cur: any[];
    let prev: any[];
    if (role === 'caregiver') {
      cur = await this._eventsRepo.findByRangeForCaregiver(userId, start, end);
      prev = await this._eventsRepo.findByRangeForCaregiver(userId, prevStart, prevEnd);
    } else {
      cur = await this._eventsRepo.findByRange(userId, start, end);
      prev = await this._eventsRepo.findByRange(userId, prevStart, prevEnd);
    }

    const summarize = (arr: any[]) => {
      let danger = 0;
      let warning = 0;
      let normal = 0;
      let t = 0;
      let f = 0;
      const typeMap = new Map<string, number>();

      for (const e of arr) {
        const sev = this.getSeverity(e);
        if (sev === 'danger') danger++;
        else if (sev === 'warning') warning++;
        else normal++;

        if (this.asBool(e.confirm_status)) t++;
        else if (e.dismissed_at) f++;

        const type = (e.event_type ?? 'unknown').toString();
        typeMap.set(type, (typeMap.get(type) ?? 0) + 1);
      }

      const total = arr.length;
      const totalResolved = t + f;
      const resolved_true_rate = totalResolved > 0 ? t / totalResolved : 0;
      const false_alert_rate = totalResolved > 0 ? f / totalResolved : 0;
      const [topType, topCount] = [...typeMap.entries()].sort((a, b) => b[1] - a[1])[0] ?? [
        'unknown',
        0,
      ];

      return {
        stats: { total, danger, warning, normal, resolved_true_rate, false_alert_rate },
        top: { type: topType, count: topCount },
      };
    };

    const current = summarize(cur);
    const previous = summarize(prev);
    const pct = (a: number, b: number) => (b === 0 ? '∞' : (((a - b) / b) * 100).toFixed(0));

    const delta = {
      total_events_pct: pct(current.stats.total, previous.stats.total),
      danger_pct: pct(current.stats.danger, previous.stats.danger),
      resolved_true_rate_pct: pct(
        current.stats.resolved_true_rate,
        previous.stats.resolved_true_rate,
      ),
      false_alert_rate_pct: pct(current.stats.false_alert_rate, previous.stats.false_alert_rate),
    };

    return {
      range: {
        current: { start_time: start.toISOString(), end_time: end.toISOString() },
        previous: { start_time: prevStart.toISOString(), end_time: prevEnd.toISOString() },
      },
      pending_critical: {
        danger_pending_count: cur.filter(
          (e) => this.getSeverity(e) === 'danger' && !e.verified_at && !e.dismissed_at,
        ).length,
      },
      compare_to_last_range: {
        current: current.stats,
        previous: previous.stats,
        delta,
      },
      top_event_type: current.top,
      ai_summary:
        'So với dữ liệu trước, tỷ lệ xử lý đạt hơn 12%, cải thiện nhẹ so với trước. Cảnh báo chủ yếu vẫn là ngã và rối loạn giấc ngủ.',
      ai_recommendations: [
        'Đặt nhắc nhở uống thuốc trước 20:00 để giảm nguy cơ cảnh báo tối.',
        'Kiểm tra bố trí đồ đạc quanh lối đi phòng khách để giảm vấp ngã.',
        'Xem lại threshold cảm biến phòng tắm nếu còn báo giả.',
      ],
    };
  }
}
