import { Injectable, NotFoundException } from '@nestjs/common';
import { EventTypeEnum } from '../../../core/entities/events.entity';
import type {
  AlertFilters,
  AlertsSummary,
  MonitoringSettings,
  Sev,
} from '../../../core/types/user-detail.types';
import { EventsRepository } from '../../../infrastructure/repositories/events/events.repository';
import { UsersRepository } from '../../../infrastructure/repositories/users/users.repository';
import { SettingsService } from '../system/settings.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { UserPreferencesService } from './user-preferences.service';

@Injectable()
export class UserDetailsService {
  constructor(
    private readonly events: EventsRepository,
    private readonly users: UsersRepository,
    private readonly settings: SettingsService,
    private readonly userPreferences: UserPreferencesService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  private severityOf(event_type: EventTypeEnum, confidence?: number): Sev {
    const c = Number(confidence ?? 0);
    if (event_type === EventTypeEnum.fall || event_type === EventTypeEnum.emergency) {
      return c >= 0.9 ? 'critical' : c >= 0.6 ? 'high' : 'medium';
    }
    if (event_type === EventTypeEnum.abnormal_behavior) return c >= 0.7 ? 'high' : 'medium';
    return 'low';
  }

  async overview(user_id: string, range: 'today' | '7d' | '30d' = '7d') {
    const recent = await this.events.recentByUser(user_id, 500);
    const summary = { low: 0, medium: 0, high: 0, critical: 0 } as Record<Sev, number>;
    const byStatus: Record<string, number> = {};

    for (const e of recent) {
      const sev = this.severityOf(
        e.event_type as EventTypeEnum,
        e.confidence_score != null ? Number(e.confidence_score) : undefined,
      );
      summary[sev]++;
      byStatus[e.status ?? 'unknown'] = (byStatus[e.status ?? 'unknown'] ?? 0) + 1;
    }

    const alertCount = recent.length;
    return {
      cameraActive: undefined,
      monitorTime: undefined,
      alertCount,
      aiAccuracy: undefined,
      alertsSummary: {
        bySeverity: summary,
        byStatus,
        emergencyToday: 0,
        importantToday: 0,
        info7d: 0,
        resolved30d: 0,
      },
    };
  }

  async alerts(user_id: string, query: Record<string, unknown>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit ?? 20)));
    const orderBy = query.orderBy === 'confidence_score' ? 'confidence_score' : 'detected_at';
    const order = String(query.order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const sevAllow = new Set<Sev>(['low', 'medium', 'high', 'critical']);

    const types =
      typeof query.type === 'string'
        ? query.type.split(',').map((s) => s.trim())
        : Array.isArray(query.type)
          ? (query.type as string[])
          : undefined;

    const statuses =
      typeof query.status === 'string'
        ? query.status.split(',').map((s) => s.trim())
        : Array.isArray(query.status)
          ? (query.status as string[])
          : undefined;

    const severities = Array.isArray(query.severity)
      ? (query.severity as string[])
          .map((s) => s.trim())
          .filter((s): s is Sev => sevAllow.has(s as Sev))
      : undefined;

    const dateFrom = typeof query.dateFrom === 'string' ? query.dateFrom : undefined;
    const dateTo = typeof query.dateTo === 'string' ? query.dateTo : undefined;

    const filters: AlertFilters = { types, statuses, severities, dateFrom, dateTo };
    const { data, total } = await this.events.findAlertsByUserPaginated(
      user_id,
      filters,
      page,
      limit,
      orderBy,
      order,
    );

    const items = data.map((e) => ({
      event_id: e.event_id,
      user_id: e.user_id,
      camera_id: e.camera_id,
      event_type: e.event_type,
      status: e.status,
      detected_at: e.detected_at,
      confidence_score: e.confidence_score,
      context_data: e.context_data,
      snapshot_id: e.snapshot_id,
      severity: this.severityOf(
        e.event_type,
        e.confidence_score !== null ? Number(e.confidence_score) : undefined,
      ),
    }));

    let summary: AlertsSummary | undefined;
    const includeSummary = String(query.includeSummary ?? 'true') !== 'false';
    if (includeSummary) {
      const [sevRows, stRows] = await Promise.all([
        this.events.summaryByStatusSummary(user_id, filters),
        this.events.summaryByStatus(user_id, filters),
      ]);

      const bySeverity: Record<Sev, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      };

      for (const r of sevRows) bySeverity[r.severity as Sev] = Number(r.count);
      const byStatus: Record<string, number> = {};
      for (const r of stRows) byStatus[r.status] = Number(r.count);
      summary = { bySeverity, byStatus };
    }

    return {
      items,
      pagination: { page, limit, total },
      ...(summary ? { summary } : {}),
    };
  }

  async monitoringGet(user_id: string, options?: { include?: string[]; date?: string }) {
    const key = `monitoring`;
    let settings: MonitoringSettings = {
      fallDetection: true,
      sleepMonitoring: false,
      medicationReminders: false,
      abnormalDetection: true,
      sensitivity: 'medium',
      maxSitMinutes: 60,
      notifyChannels: ['sms'],
    };
    try {
      const s = await this.userPreferences.get(user_id, 'monitoring', key);
      if (s?.setting_value) settings = JSON.parse(s.setting_value) as MonitoringSettings;
    } catch {}

    const inc = new Set((options?.include ?? []).map((s) => s.trim()));
    const needAll = inc.size === 0;

    const recent = options?.date
      ? (await this.events.recentByUser(user_id, 200)).filter((e) => {
          if (!options.date) return true;
          const eventDate = new Date(e.detected_at).toISOString().slice(0, 10);
          return eventDate === options.date;
        })
      : await this.events.recentByUser(user_id, 200);

    const analytics24h = {
      normalWalkCount: 0,
      sitLieMinutes: 0,
      abnormalCount: recent.length,
      emergencyCount: recent.filter((e) =>
        [EventTypeEnum.fall, EventTypeEnum.emergency].includes(e.event_type as any),
      ).length,
      aiAccuracy: undefined,
    };

    const timeline = recent.slice(0, 50).map((e) => ({
      time: new Date(e.detected_at).toISOString(),
      activity: e.event_type,
      type: e.status,
      location: undefined,
      duration: undefined,
    }));

    return {
      ...(needAll || inc.has('settings') ? { settings } : {}),
      ...(needAll || inc.has('analytics') ? { analytics24h } : {}),
      ...(needAll || inc.has('timeline') ? { timeline } : {}),
      ...(options?.date ? { date: options.date } : {}),
    };
  }

  async monitoringPatch(user_id: string, patch: Partial<MonitoringSettings>, updatedBy?: string) {
    const key = `monitoring`;
    let current: Partial<MonitoringSettings> = {};
    try {
      const s = await this.settings.get(key);
      if (s?.value) current = JSON.parse(s.value);
    } catch {}

    const next: Partial<MonitoringSettings> = { ...current, ...patch };
    await this.userPreferences.set(user_id, key, JSON.stringify(next), updatedBy);
    return { updated: true };
  }

  async services(user_id: string, include?: string[]) {
    const inc = new Set((include ?? []).map((s) => s.trim()));

    // Get real subscription data
    const subscriptionData =
      inc.size === 0 || inc.has('subscription')
        ? await this.subscriptionService.getActive(user_id)
        : null;

    const subscription = subscriptionData
      ? {
          name: subscriptionData.plans?.name || 'N/A',
          contractId: subscriptionData.subscription_id,
          startDate: subscriptionData.started_at
            ? (() => {
                try {
                  return new Date(subscriptionData.started_at).toISOString().split('T')[0];
                } catch {
                  return 'Invalid Date';
                }
              })()
            : 'N/A',
          endDate: subscriptionData.ended_at
            ? (() => {
                try {
                  return new Date(subscriptionData.ended_at).toISOString().split('T')[0];
                } catch {
                  return 'Invalid Date';
                }
              })()
            : 'N/A',
          remaining: subscriptionData.ended_at
            ? (() => {
                try {
                  const endTime = new Date(subscriptionData.ended_at).getTime();
                  return (
                    Math.max(0, Math.ceil((endTime - Date.now()) / (1000 * 60 * 60 * 24))) + ' days'
                  );
                } catch {
                  return 'Invalid Date';
                }
              })()
            : 'N/A',
          cameraCount: subscriptionData.plans?.camera_quota || 0,
          features: [],
        }
      : undefined;

    return {
      ...(subscription ? { subscription } : {}),
      ...(inc.size === 0 || inc.has('devices') ? { devices: [] } : {}),
      ...(inc.size === 0 || inc.has('maintenance') ? { maintenance: [] } : {}),
      ...(inc.size === 0 || inc.has('billing')
        ? {
            billing: {
              items: [],
              pagination: { page: 1, limit: 20, total: 0 },
            },
          }
        : {}),
    };
  }

  async admin(user_id: string) {
    const u = await this.users.findUserByIdPublic(user_id);
    if (!u) throw new NotFoundException('User not found');
    return {
      system: {
        createdAt: u.created_at,
        isActive: !!u.is_active,
        lastLogin: undefined,
        lastLoginIp: undefined,
        device: undefined,
      },
      activities: [],
    };
  }

  async medicalInfo(user_id: string) {
    return {
      patient: { id: user_id, name: 'N/A', dob: undefined },
      record: { name: null, notes: null, history: [] },
      contacts: [],
    };
  }
}
