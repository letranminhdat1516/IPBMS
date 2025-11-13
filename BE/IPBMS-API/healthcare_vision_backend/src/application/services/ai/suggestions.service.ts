import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { SystemConfigService } from '../system/system-config.service';
import { FcmCoreService } from '../fcm/fcm.core.service';
import { NotificationsService } from '../notifications/notifications.service';
import { processSingleSuggestion } from '../../../shared/utils/push-notification.helpers';
import { title } from 'process';

type Duration =
  | '15m'
  | '1h'
  | '8h'
  | '24h'
  | '2d'
  | '7d'
  | '30d'
  | 'until_change'
  | 'until_date'
  | undefined;

@Injectable()
export class SuggestionsService {
  private readonly logger = new Logger(SuggestionsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly _systemConfig?: SystemConfigService,
    private readonly _fcmCoreService?: FcmCoreService,
    private readonly _notificationsService?: NotificationsService,
  ) {}

  async computeNextNotifyAt(
    suggestion: { created_at?: Date | string; priority?: string | null } | any,
  ): Promise<Date | null> {
    const now = new Date();
    if (suggestion?.priority && String(suggestion.priority).toLowerCase() === 'high') {
      return now;
    }
    // TTL (days)
    const cfgTtl = this._systemConfig
      ? await this._systemConfig.getInt('suggestions.ttl_days').catch(() => null)
      : null;
    let ttlDays = cfgTtl ?? Number(process.env.SUGGESTIONS_TTL_DAYS ?? '30');
    if (!Number.isInteger(ttlDays) || ttlDays < 0 || ttlDays > 3650) ttlDays = 30;

    // if suggestion expired by ttl -> no next notify
    if (suggestion?.created_at) {
      const created = new Date(suggestion.created_at);
      if (!isNaN(created.getTime())) {
        const expire = new Date(created.getTime() + ttlDays * 24 * 60 * 60 * 1000);
        if (expire.getTime() <= now.getTime()) return null;
      }
    }

    // reminder interval in hours
    const cfgRem = this._systemConfig
      ? await this._systemConfig.getInt('suggestions.reminder_interval_hours').catch(() => null)
      : null;
    let reminderHours = cfgRem ?? Number(process.env.SUGGESTIONS_REMINDER_INTERVAL_HOURS ?? '48');
    if (!Number.isInteger(reminderHours) || reminderHours < 0 || reminderHours > 8760)
      reminderHours = 48;

    return new Date(now.getTime() + reminderHours * 60 * 60 * 1000);
  }

  /**
   * Determine whether a suggestion is muted for a user given a pref map.
   * prefsMap shape: { [userId]: { [setting_key]: UserPreferenceRow } }
   */
  isMutedForUser(
    suggestion: any,
    prefsMap: Record<string, Record<string, any>>,
    nowOverride?: Date,
  ): { muted: boolean; reason?: string; prefKey?: string } {
    const now = nowOverride ?? new Date();
    const nowTs = now.getTime();
    const userId = suggestion?.user_id;
    const result = {
      muted: false,
      reason: undefined as string | undefined,
      prefKey: undefined as string | undefined,
    };
    if (!userId) return result;

    const userPrefs = prefsMap[userId] ?? {};

    const prefAll = this.parsePreference(userPrefs['mute:all']);
    if (prefAll.enabled && prefAll.until === null)
      return { muted: true, reason: prefAll.reason, prefKey: 'mute:all' };
    if (prefAll.enabled && prefAll.until && prefAll.until.getTime() > nowTs)
      return { muted: true, reason: prefAll.reason, prefKey: 'mute:all' };

    if (suggestion?.type) {
      const prefType = this.parsePreference(userPrefs[`mute:type:${suggestion.type}`]);
      if (prefType.enabled && prefType.until === null)
        return { muted: true, reason: prefType.reason, prefKey: `mute:type:${suggestion.type}` };
      if (prefType.enabled && prefType.until && prefType.until.getTime() > nowTs)
        return { muted: true, reason: prefType.reason, prefKey: `mute:type:${suggestion.type}` };
    }

    if (suggestion?.skip_until) {
      const su = new Date(suggestion.skip_until);
      if (!isNaN(su.getTime()) && su.getTime() > nowTs)
        return { muted: true, reason: suggestion.skip_reason, prefKey: 'item' };
    }

    return result;
  }

  private parsePreference(pref: any): { enabled: boolean; until: Date | null; reason?: string } {
    if (!pref) return { enabled: false, until: null };
    const enabled = !!pref.is_enabled;
    let val: any = pref.setting_value;
    if (typeof val === 'string') {
      try {
        val = JSON.parse(val);
      } catch {
        val = null;
      }
    }
    if (!val) return { enabled, until: null, reason: undefined };
    if (val.until === null) return { enabled, until: null, reason: val.reason };
    if (val.until) {
      const d = new Date(val.until);
      if (!isNaN(d.getTime())) return { enabled, until: d, reason: val.reason };
    }
    return { enabled, until: null, reason: val.reason };
  }

  async list(
    userId: string,
    options?: { type?: string; page?: number; limit?: number; includeMuted?: boolean },
  ) {
    const page = options?.page && options?.page > 0 ? options.page : 1;
    const limit = options?.limit && options?.limit > 0 ? options.limit : 50;
    const includeMuted = options?.includeMuted === true;

    const whereAny: any = { user_id: userId };
    if (options?.type) whereAny.type = options.type;

    // fetch raw items (we'll apply mute filtering according to user preferences below)
    const items = await this.prisma.suggestions.findMany({
      where: whereAny,
      orderBy: { next_notify_at: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // load user's suggestion preferences once (keys startWith 'mute')
    let rawPrefs: any = await this.prisma.user_preferences.findMany({
      where: { user_id: userId, category: 'suggestions', setting_key: { startsWith: 'mute' } },
    });
    if (!Array.isArray(rawPrefs)) rawPrefs = [];
    const prefsMap: Record<string, any> = {};
    for (const p of rawPrefs) prefsMap[p.setting_key] = p;

    const now = new Date();

    const mapped = items
      .map((it: any) => {
        const muteInfo = this.isMutedForUser(it, { [userId]: prefsMap }, now);
        return {
          id: it.suggestion_id,
          user_id: it.user_id,
          resource_type: it.resource_type,
          resource_id: it.resource_id,
          type: it.type,
          title: it.title,
          message: it.message,
          skip_until: it.skip_until,
          next_notify_at: it.next_notify_at,
          last_notified_at: it.last_notified_at,
          skip_scope: it.skip_scope,
          skip_type: it.skip_type,
          skip_reason: it.skip_reason,
          created_at: it.created_at,
          updated_at: it.updated_at,
          muted: muteInfo.muted,
          mute_reason: muteInfo.reason,
          meta: it.meta,
        } as any;
      })
      .filter((it: any) => (includeMuted ? true : !it.muted));

    return mapped;
  }

  async ingestSuggestion(
    userId: string,
    payload: {
      resource_type: string;
      resource_id: string;
      type: string;
      title?: string | null;
      message?: string | null;
      meta?: any;
      priority?: string | null;
    },
  ) {
    const { resource_type, resource_id, type, title, message, meta } = payload;

    const existing = await this.prisma.suggestions.findFirst({
      where: { user_id: userId, resource_type, resource_id, type },
    });
    if (existing) {
      const updateData: Record<string, any> = { status: 'ACTIVE', updated_at: new Date() };
      if (title !== undefined) updateData.title = title;
      if (message !== undefined) updateData.message = message;
      if (meta !== undefined) updateData.meta = meta;
      const updated = await this.prisma.suggestions.update({
        where: { suggestion_id: existing.suggestion_id },
        data: updateData as any,
      });
      return updated;
    }

    // for new suggestions: create and send immediate FCM, schedule reminders
    const proto = { created_at: new Date(), priority: (payload && payload.priority) || undefined };
    // compute initial next_notify_at as reminder interval (not immediate)
    const next = await this.computeNextNotifyAt(proto);
    const createData: any = {
      user_id: userId,
      resource_type,
      resource_id,
      type,
      title: title ?? null,
      message: message ?? null,
      meta: meta ?? undefined,
      status: 'ACTIVE',
      next_notify_at: next === null ? null : next,
    };
    const created = await this.prisma.suggestions.create({ data: createData });

    // send immediate notification (always) using shared helper so DB notifications are recorded alike
    try {
      const now = new Date();
      // prepare prefsMap for this user
      let rawPrefsForUser: any = await this.prisma.user_preferences.findMany({
        where: { user_id: userId, category: 'suggestions', setting_key: { startsWith: 'mute' } },
      });
      if (!Array.isArray(rawPrefsForUser)) rawPrefsForUser = [];
      const prefsMap: Record<string, Record<string, any>> = {};
      prefsMap[userId] = {};
      for (const p of rawPrefsForUser) prefsMap[userId][p.setting_key] = p;

      const { map: tokensMap } = this._fcmCoreService
        ? await this._fcmCoreService.getAudienceTokensGroupedByUser([userId])
        : { map: { [userId]: [] } };

      await processSingleSuggestion(
        created,
        prefsMap,
        tokensMap,
        Number(process.env.SUGGESTIONS_REMINDER_INTERVAL_HOURS ?? 48),
        now,
        {
          suggestionsService: this,
          notificationsService: this._notificationsService as any,
          fcmCoreService: this._fcmCoreService,
          prisma: this.prisma,
          logger: this.logger,
        },
      );
    } catch (err) {
      this.logger.warn('Failed to send immediate suggestion notification', err as any);
    }

    return created;
  }

  private parseDurationToDate(duration: Duration, untilDate?: string): Date | null {
    const now = new Date();
    if (!duration) return null;
    if (duration === 'until_change') return null;
    if (duration === 'until_date') {
      if (!untilDate)
        throw new BadRequestException('until_date is required for duration until_date');
      const d = new Date(untilDate);
      if (isNaN(d.getTime())) throw new BadRequestException('until_date is invalid');
      if (d.getTime() < Date.now())
        throw new BadRequestException('until_date must be in the future');
      return d;
    }

    const mapping: Record<string, number> = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '8h': 8 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '2d': 2 * 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const ms = mapping[duration as string];
    if (!ms) return null;
    return new Date(now.getTime() + ms);
  }

  async toggleSkip(payload: any, userId: string, suggestionId?: string) {
    const { action, duration, scope, until_date, reason, type } = payload;

    if (!action) throw new BadRequestException('action is required');
    if (!scope) throw new BadRequestException('scope is required');
    if (scope === 'type' && !type)
      throw new BadRequestException('type is required when scope=type');

    // compute skip_until
    let skipUntil: Date | null = null;
    if (action === 'unskip') {
      skipUntil = null;
    } else {
      skipUntil = this.parseDurationToDate(duration, until_date);
      // if duration missing, default to 30 days
      if (!skipUntil && duration === undefined) {
        skipUntil = this.parseDurationToDate('30d');
      }
    }

    if (scope === 'item') {
      // operate on suggestions table row (suggestionId required)
      if (!suggestionId) throw new BadRequestException('suggestion id required for scope=item');
      const data: any = {};
      if (action === 'unskip') {
        data.skip_until = null;
        data.next_notify_at = new Date();
      } else {
        data.skip_until = skipUntil;
        data.next_notify_at = null;
      }

      // merge semantics: if existing skip_until exists, keep the later one
      const existing = await this.prisma.suggestions.findUnique({
        where: { suggestion_id: suggestionId },
      });
      let finalSkipUntil = data.skip_until ?? null;
      if (existing && existing.skip_until && data.skip_until) {
        const existingDt = new Date(existing.skip_until);
        const newDt = new Date(data.skip_until);
        if (!isNaN(existingDt.getTime()) && !isNaN(newDt.getTime())) {
          finalSkipUntil = existingDt.getTime() > newDt.getTime() ? existingDt : newDt;
        }
      }

      const upsert = await this.prisma.suggestions.upsert({
        where: { suggestion_id: suggestionId },
        create: {
          suggestion_id: suggestionId,
          user_id: userId,
          skip_until: finalSkipUntil,
          skip_scope: 'item',
          skip_reason: reason,
          next_notify_at: data.next_notify_at,
        },
        update: { ...data, skip_until: finalSkipUntil },
      });

      return {
        id: upsert.suggestion_id,
        status: action === 'unskip' ? 'active' : 'skipped',
        scope: 'item',
        skip_until: upsert.skip_until,
        next_notify_at: upsert.next_notify_at,
        effective_mutes: [{ scope: 'item', until: upsert.skip_until }],
      };
    }

    // scope type or all -> store in user_preferences
    const settingKey = scope === 'all' ? 'mute:all' : `mute:type:${type}`;
    if (action === 'unskip') {
      const value = JSON.stringify({ until: null, reason: null });
      await this.prisma.user_preferences.upsert({
        where: {
          user_id_category_setting_key: {
            user_id: userId,
            category: 'suggestions',
            setting_key: settingKey,
          },
        },
        create: {
          user_id: userId,
          category: 'suggestions',
          setting_key: settingKey,
          setting_value: value,
          is_enabled: false,
        },
        update: { is_enabled: false, setting_value: value, overridden_at: new Date() },
      });

      return {
        id: '_',
        status: 'active',
        scope,
        skip_until: null,
        next_notify_at: new Date(),
        effective_mutes: [],
      };
    }

    // merge semantics for preferences: if existing until is later, keep it
    const existingPref = await this.prisma.user_preferences.findFirst({
      where: { user_id: userId, category: 'suggestions', setting_key: settingKey },
    });

    let finalUntil: Date | null = skipUntil ?? null;
    if (existingPref && existingPref.setting_value) {
      try {
        const parsed =
          typeof existingPref.setting_value === 'string'
            ? JSON.parse(existingPref.setting_value)
            : existingPref.setting_value;
        if (parsed && parsed.until) {
          const existingUntil = new Date(parsed.until);
          if (!isNaN(existingUntil.getTime())) {
            if (!finalUntil || existingUntil > finalUntil) finalUntil = existingUntil;
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn('Could not parse existing suggestion preference setting_value', msg);
      }
    }

    const value = JSON.stringify({ until: finalUntil ? finalUntil.toISOString() : null, reason });
    await this.prisma.user_preferences.upsert({
      where: {
        user_id_category_setting_key: {
          user_id: userId,
          category: 'suggestions',
          setting_key: settingKey,
        },
      },
      create: {
        user_id: userId,
        category: 'suggestions',
        setting_key: settingKey,
        setting_value: value,
        is_enabled: true,
      },
      update: {
        setting_value: value,
        is_enabled: true,
        overridden_at: new Date(),
      },
    });

    return {
      id: '_',
      status: 'skipped',
      scope,
      skip_until: finalUntil,
      next_notify_at: null,
      effective_mutes: [{ scope, until: finalUntil }],
    };
  }
}
