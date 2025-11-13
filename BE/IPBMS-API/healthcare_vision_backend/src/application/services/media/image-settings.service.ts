import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { pickIntFromMaps, pickQualityFromMaps } from '../../../shared/utils/image-settings.util';
import { ImageSettingsRepository } from '../../../infrastructure/repositories/media/image-settings.repository';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

interface SystemDefault {
  key: string;
  value: string;
  data_type: string;
}

@Injectable()
export class ImageSettingsService {
  private readonly _logger = new Logger(ImageSettingsService.name);
  constructor(
    private readonly _repo: ImageSettingsRepository,
    private readonly _prismaService: PrismaService,
  ) {}

  async list(user_id: string) {
    const userSettings = await this._repo.list(user_id);
    const systemDefaults = await this._prismaService.system_config.findMany({
      where: { category: 'image' },
      select: {
        setting_key: true,
        setting_value: true,
        data_type: true,
      },
    });

    const transformedDefaults = systemDefaults.map((setting: any) => ({
      key: setting.setting_key,
      value: setting.setting_value,
      data_type: setting.data_type,
    }));

    const userMap = new Map<string, any>(userSettings.map((s: any) => [s.key, s]));

    return transformedDefaults.map((sys: SystemDefault) => {
      const u = userMap.get(sys.key);

      if (u && u.is_overridden) {
        return {
          ...u,
          value: sys.data_type === 'boolean' ? null : u.value,
          is_enabled: sys.data_type === 'boolean' ? u.is_enabled : true,
          source: 'user' as const,
        };
      }

      return {
        user_id,
        key: sys.key,
        value: sys.data_type === 'boolean' ? null : sys.value,
        is_enabled: sys.data_type === 'boolean' ? sys.value === 'true' : true,
        is_overridden: false,
        overridden_at: null,
        updated_by: null,
        source: 'system' as const,
      };
    });
  }

  /**
   * Return compact image settings object used by UI/API consumers.
   * Shape:
   * {
   *   normal_image_retention_time: number,
   *   alert_image_retention_time: number,
   *   image_storage_quality: string
   * }
   */
  async getCompact(user_id: string) {
    const userSettings = await this._repo.list(user_id);
    const systemDefaults = await this._prismaService.system_config.findMany({
      where: { category: 'image' },
      select: { setting_key: true, setting_value: true, data_type: true },
    });

    const sysMap = new Map<string, any>(systemDefaults.map((s: any) => [s.setting_key, s]));
    const userMap = new Map<string, any>(userSettings.map((s: any) => [s.key, s]));

    const normal = pickIntFromMaps(
      userMap,
      sysMap,
      [
        'image.normal_retention_days',
        'normal_retention_days',
        'retention_normal_days',
        'retention_days',
      ],
      30,
    );

    const alert = pickIntFromMaps(
      userMap,
      sysMap,
      ['image.alert_retention_days', 'retention_alert_days', 'alert_retention_days'],
      90,
    );

    const quality = pickQualityFromMaps(
      userMap,
      sysMap,
      ['image_quality', 'image.quality', 'image_storage_quality', 'image.storage_quality'],
      '1080',
    );

    return {
      normal_image_retention_time: normal,
      alert_image_retention_time: alert,
      image_storage_quality: quality,
    };
  }

  async get(user_id: string, key: string) {
    // Fetch the per-user entry (if exists) and system definition
    const u = await this._repo.get(user_id, key);

    const systemSetting = await this._prismaService.system_config.findFirst({
      where: {
        setting_key: key,
        category: 'image',
      },
      select: {
        setting_key: true,
        setting_value: true,
        data_type: true,
      },
    });

    if (!systemSetting) throw new NotFoundException(`Invalid image setting key: ${key}`);

    const sys = {
      key: systemSetting.setting_key,
      value: systemSetting.setting_value,
      data_type: systemSetting.data_type,
    };

    const { data_type, value: sysValue } = sys;

    // For certain keys, normalize the returned value to match the compact API
    const retentionCandidates = [
      'image.normal_retention_days',
      'normal_retention_days',
      'retention_normal_days',
      'retention_days',
      'image.alert_retention_days',
      'retention_alert_days',
      'alert_retention_days',
    ];

    const qualityCandidates = [
      'image_quality',
      'image.quality',
      'image_storage_quality',
      'image.storage_quality',
    ];

    // If key refers to a retention or quality setting, build maps and use pickers
    if (retentionCandidates.includes(key) || qualityCandidates.includes(key)) {
      const userSettings = await this._repo.list(user_id);
      const systemDefaults = await this._prismaService.system_config.findMany({
        where: { category: 'image' },
        select: { setting_key: true, setting_value: true, data_type: true },
      });

      const sysMap = new Map<string, any>(systemDefaults.map((s: any) => [s.setting_key, s]));
      const userMap = new Map<string, any>(userSettings.map((s: any) => [s.key, s]));

      if (retentionCandidates.includes(key)) {
        const fallback = key.includes('alert') ? 90 : 30;
        const normalized = pickIntFromMaps(userMap, sysMap, retentionCandidates, fallback);

        // Return the same metadata shape but with normalized numeric value
        if (u && u.is_overridden) {
          return {
            ...u,
            value: normalized,
            is_enabled: data_type === 'boolean' ? u.is_enabled : true,
            source: 'user' as const,
          };
        }

        return {
          user_id,
          key,
          value: normalized,
          is_enabled: data_type === 'boolean' ? sysValue === 'true' : true,
          is_overridden: false,
          overridden_at: null,
          updated_by: null,
          source: 'system' as const,
        };
      }

      if (qualityCandidates.includes(key)) {
        const normalized = pickQualityFromMaps(userMap, sysMap, qualityCandidates, '1080');

        if (u && u.is_overridden) {
          return {
            ...u,
            value: normalized,
            is_enabled: data_type === 'boolean' ? u.is_enabled : true,
            source: 'user' as const,
          };
        }

        return {
          user_id,
          key,
          value: normalized,
          is_enabled: data_type === 'boolean' ? sysValue === 'true' : true,
          is_overridden: false,
          overridden_at: null,
          updated_by: null,
          source: 'system' as const,
        };
      }
    }

    // Fallback: return the raw metadata as before
    if (u && u.is_overridden) {
      return {
        ...u,
        value: data_type === 'boolean' ? null : u.value,
        is_enabled: data_type === 'boolean' ? u.is_enabled : true,
        source: 'user' as const,
      };
    }

    return {
      user_id,
      key,
      value: data_type === 'boolean' ? null : sysValue,
      is_enabled: data_type === 'boolean' ? sysValue === 'true' : true,
      is_overridden: false,
      overridden_at: null,
      updated_by: null,
      source: 'system' as const,
    };
  }

  async set(
    user_id: string,
    key: string,
    value?: string | null,
    is_enabled?: boolean,
    updatedBy?: string,
  ) {
    const systemSetting = await this._prismaService.system_config.findFirst({
      where: {
        setting_key: key,
        category: 'image',
      },
      select: {
        setting_key: true,
        data_type: true,
      },
    });

    if (!systemSetting) throw new NotFoundException(`Invalid image setting key: ${key}`);

    return this._repo.set(user_id, key, value, is_enabled ?? true, updatedBy);
  }

  async toggle(user_id: string, key: string, enabled: boolean, updatedBy?: string) {
    const systemSetting = await this._prismaService.system_config.findFirst({
      where: {
        setting_key: key,
        category: 'image',
      },
      select: {
        setting_key: true,
      },
    });

    if (!systemSetting) throw new NotFoundException(`Invalid image setting key: ${key}`);

    return this._repo.setToggle(user_id, key, enabled, updatedBy);
  }

  async batchSave(user_id: string, settings: Record<string, any>, updatedBy?: string) {
    const results = [];

    for (const [key, value] of Object.entries(settings)) {
      try {
        // Validate that the setting key exists in system settings
        const systemSetting = await this._prismaService.system_config.findFirst({
          where: {
            setting_key: key,
            category: 'image',
          },
          select: {
            setting_key: true,
            data_type: true,
          },
        });

        if (!systemSetting) {
          throw new NotFoundException(`Invalid image setting key: ${key}`);
        }

        // Handle boolean settings differently
        const isBoolean = systemSetting.data_type === 'boolean';
        const isEnabled = isBoolean ? value : true;
        const settingValue = isBoolean ? null : String(value);

        const result = await this._repo.set(user_id, key, settingValue, isEnabled, updatedBy);
        results.push(result);
      } catch (error) {
        // Continue with other settings even if one fails
        this._logger.error(
          `Failed to save setting ${key}: ${error instanceof Error ? error.message : String(error)}`,
        );
        results.push({ key, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return {
      success: true,
      data: results,
      message: `Batch saved ${results.length} image settings`,
    };
  }
}
