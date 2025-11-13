import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import type { system_config } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ActivityLogsService } from '../shared/activity-logs.service';
import { SystemConfigRepository } from '../../../infrastructure/repositories/system/system-config.repository';

@Injectable()
export class SystemConfigService implements OnModuleInit {
  private readonly logger = new Logger(SystemConfigService.name);
  private readonly _cacheTtlMs = 30 * 1000;
  private readonly _cache = new Map<string, { value: string | null; expiresAt: number }>();
  constructor(
    private readonly prismaService: PrismaService,
    private readonly _repo: SystemConfigRepository,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async getAllSettings(): Promise<system_config[]> {
    return (await this._repo.listSystemSettings()) as unknown as system_config[];
  }

  async getSettingByKey(key: string): Promise<system_config | null> {
    return (await this._repo.getSystemSetting(key)) as unknown as system_config | null;
  }

  async getSettingsByCategory(category: string): Promise<system_config[]> {
    const all = (await this._repo.listSystemSettings()) as unknown as system_config[];
    return all
      .filter((s) => s.category === category)
      .sort((a, b) => String(a.setting_key).localeCompare(String(b.setting_key)));
  }

  async createSetting(data: {
    setting_key: string;
    setting_value: string;
    description?: string;
    data_type?: string;
    category?: string;
    is_encrypted?: boolean;
    updated_by: string;
  }): Promise<system_config> {
    // Use repository layer to create/upsert the setting which enforces required fields
    const created = (await this._repo.set(
      data.setting_key,
      String(data.setting_value),
      data.updated_by,
    )) as unknown as system_config;

    // Log the creation
    await this.activityLogs.logSettingChange(
      data.updated_by,
      data.setting_key,
      {
        oldValue: undefined,
        newValue: data.setting_value,
        source: 'system',
        category: data.category || (created as any).category || 'general',
        dataType: data.data_type || (created as any).data_type || 'string',
        action: 'create',
        isOverride: false,
      },
      {
        message: `Cấu hình hệ thống được tạo: ${data.category || 'general'}.${data.setting_key}`,
      },
    );

    // cache created value
    this._cache.set(data.setting_key, {
      value: String(data.setting_value),
      expiresAt: Date.now() + this._cacheTtlMs,
    });

    return created;
  }

  async updateSetting(
    setting_key: string,
    data: {
      setting_value?: string;
      description?: string;
      data_type?: string;
      category?: string;
      is_encrypted?: boolean;
      updated_by?: string;
    },
  ): Promise<system_config | null> {
    // We only support updating the value and updated_by through repository
    try {
      const current = await this.getSettingByKey(setting_key);
      const newValue =
        data.setting_value !== undefined ? data.setting_value : (current?.setting_value ?? '');
      const updatedBy = data.updated_by ?? (current as any)?.updated_by ?? 'system';
      const updated = (await this._repo.set(
        setting_key,
        String(newValue),
        updatedBy,
      )) as unknown as system_config;
      // refresh cache for this key
      this._cache.set(setting_key, {
        value: String(newValue),
        expiresAt: Date.now() + this._cacheTtlMs,
      });
      return updated;
    } catch {
      return null;
    }
  }

  async deleteSetting(key: string): Promise<{ deleted: boolean }> {
    try {
      await this.prismaService.system_config.delete({
        where: { setting_key: key },
      });
      return { deleted: true };
    } catch {
      return { deleted: false };
    }
  }

  async getSettingValue(key: string): Promise<string | null> {
    const now = Date.now();
    const cached = this._cache.get(key);
    if (cached && cached.expiresAt > now) return cached.value;

    const setting = await this.getSettingByKey(key);
    const val = setting ? setting.setting_value : null;
    this._cache.set(key, { value: val, expiresAt: Date.now() + this._cacheTtlMs });
    return val;
  }

  async setSettingValue(key: string, value: string, updatedBy: string): Promise<system_config> {
    // Delegate to repository which performs upsert and enforces updatedBy when creating
    const savedRaw = await this._repo.set(key, String(value), updatedBy);
    // Invalidate/refresh cache for this key
    this._cache.set(key, { value: String(value), expiresAt: Date.now() + this._cacheTtlMs });
    return savedRaw as unknown as system_config;
  }

  async getByCategoryAndKey(category: string, key: string): Promise<system_config | null> {
    try {
      const all = (await this._repo.listSystemSettings()) as unknown as system_config[];
      const setting = all.find((s) => s.category === category && s.setting_key === key);
      return setting || null;
    } catch {
      return null;
    }
  }

  async getBoolean(key: string): Promise<boolean> {
    const val = await this.getSettingValue(key);
    return val === 'true';
  }

  async getMultipleBooleans(keys: string[]): Promise<Record<string, boolean>> {
    const settings = await this.prismaService.system_config.findMany({
      where: {
        setting_key: { in: keys },
      },
    });

    const result: Record<string, boolean> = {};
    for (const key of keys) {
      const setting = settings.find((s) => s.setting_key === key);
      result[key] = setting ? setting.setting_value === 'true' : false;
    }

    return result;
  }

  async getJson<T = any>(key: string): Promise<T> {
    const val = await this.getSettingValue(key);
    try {
      return JSON.parse(val ?? 'null') as T;
    } catch {
      throw new Error(`Invalid JSON trong cấu hình hệ thống "${key}": ${val}`);
    }
  }

  async getInt(key: string): Promise<number | null> {
    const val = await this.getSettingValue(key);
    const parsed = parseInt(val ?? '', 10);
    return isNaN(parsed) ? null : parsed;
  }

  async getDate(key: string): Promise<Date | null> {
    const val = await this.getSettingValue(key);
    const parsed = new Date(val ?? '');
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  async getString(key: string): Promise<string> {
    const setting = await this.getSettingByKey(key);
    if (!setting) throw new NotFoundException(`Setting ${key} not found`);
    return setting.setting_value;
  }

  async batchUpsertSettings(
    settings: Array<{
      setting_key: string;
      setting_value: string;
      description?: string;
      data_type?: string;
      category?: string;
      is_encrypted?: boolean;
      updated_by: string;
    }>,
  ): Promise<void> {
    // Use transaction to ensure atomicity
    await this.prismaService.$transaction(async (tx) => {
      for (const setting of settings) {
        await tx.system_config.upsert({
          where: { setting_key: setting.setting_key },
          update: {
            setting_value: setting.setting_value,
            description: setting.description,
            data_type: (setting.data_type as any) || 'string',
            category: setting.category || 'general',
            is_encrypted: setting.is_encrypted || false,
            updated_by: setting.updated_by,
            updated_at: new Date(),
          },
          create: {
            setting_key: setting.setting_key,
            setting_value: setting.setting_value,
            description: setting.description,
            data_type: (setting.data_type as any) || 'string',
            category: setting.category || 'general',
            is_encrypted: setting.is_encrypted || false,
            updated_by: setting.updated_by,
          },
        });

        // update cache per setting
        this._cache.set(setting.setting_key, {
          value: String(setting.setting_value),
          expiresAt: Date.now() + this._cacheTtlMs,
        });
      }
    });
  }

  /**
   * Ensure default settings exist on bootstrap. This will only create keys that do not exist
   * so admins' existing values are not overwritten.
   */
  async onModuleInit(): Promise<void> {
    try {
      const defaults: Array<{ key: string; value: string; updated_by: string }> = [
        { key: 'suggestions.ttl_days', value: '30', updated_by: 'system' },
        { key: 'suggestions.reminder_interval_hours', value: '48', updated_by: 'system' },
        // default mapping for suggestion skip durations (ms)
        {
          key: 'suggestions.duration_map',
          value: JSON.stringify({
            '15m': 15 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '8h': 8 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '2d': 2 * 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
          }),
          updated_by: 'system',
        },
        // default token used when no duration provided for skip operations
        { key: 'suggestions.default_skip_duration', value: '30d', updated_by: 'system' },
      ];

      for (const d of defaults) {
        const existing = await this.getSettingByKey(d.key);
        if (!existing) {
          this.logger.log(`Seeding default system setting ${d.key}=${d.value}`);
          await this._repo.set(d.key, d.value, d.updated_by);
        }
      }
    } catch (e) {
      this.logger.warn('Failed to ensure default system settings', e as any);
    }
  }
}
