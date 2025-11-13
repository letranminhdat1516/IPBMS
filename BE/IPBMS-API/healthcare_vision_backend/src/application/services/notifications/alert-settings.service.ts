import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertSettingsRepository } from '../../../infrastructure/repositories/notifications/alert-settings.repository';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

interface SystemDefault {
  key: string;
  value: string;
  data_type: string;
}

@Injectable()
export class AlertSettingsService {
  constructor(
    private readonly repo: AlertSettingsRepository,
    private readonly prismaService: PrismaService,
  ) {}

  async list(user_id: string) {
    const userSettings = await this.repo.list(user_id);
    const systemDefaults = await this.prismaService.system_config.findMany({
      where: { category: 'notification' },
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

    const userMap = new Map(userSettings.map((s) => [s.key, s]));

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

  async get(user_id: string, key: string) {
    const u = await this.repo.get(user_id, key);

    const systemSetting = await this.prismaService.system_config.findFirst({
      where: {
        setting_key: key,
        category: 'notification',
      },
      select: {
        setting_key: true,
        setting_value: true,
        data_type: true,
      },
    });

    if (!systemSetting) throw new NotFoundException(`Invalid alert setting key: ${key}`);

    const sys = {
      key: systemSetting.setting_key,
      value: systemSetting.setting_value,
      data_type: systemSetting.data_type,
    };

    const { data_type, value: sysValue } = sys;

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

  async set(user_id: string, key: string, value?: string | null, _?: boolean, updatedBy?: string) {
    const systemSetting = await this.prismaService.system_config.findFirst({
      where: {
        setting_key: key,
        category: 'notification',
      },
      select: {
        setting_key: true,
        data_type: true,
      },
    });

    if (!systemSetting) throw new NotFoundException(`Invalid alert setting key: ${key}`);

    return this.repo.set(user_id, key, value, true, updatedBy);
  }

  async toggle(user_id: string, key: string, enabled: boolean, updatedBy?: string) {
    const systemSetting = await this.prismaService.system_config.findFirst({
      where: {
        setting_key: key,
        category: 'notification',
      },
      select: {
        setting_key: true,
      },
    });

    if (!systemSetting) throw new NotFoundException(`Invalid alert setting key: ${key}`);

    return this.repo.setToggle(user_id, key, enabled, updatedBy);
  }
}
