import { Injectable } from '@nestjs/common';
import { BasePrismaRepository } from '../shared/base-prisma.repository';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import type { user_preferences } from '@prisma/client';
import { AlertSetting } from '../../../core/entities/alert_settings.entity';

@Injectable()
export class AlertSettingsRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async findSettingById(id: string): Promise<AlertSetting | null> {
    const setting = await super.findById<user_preferences>('user_preferences', id);
    if (!setting) return null;
    return this.settingToAlertSetting(setting);
  }

  async findAll(): Promise<AlertSetting[]> {
    const settings = await this.prisma.user_preferences.findMany({
      where: {
        category: 'alert_settings',
      },
    });
    return settings.map((setting) => this.settingToAlertSetting(setting));
  }

  async create(data: Partial<AlertSetting>): Promise<AlertSetting> {
    const setting = await this.prisma.user_preferences.create({
      data: {
        user_id: data.user_id!,
        category: 'alert_settings',
        setting_key: data.key!,
        setting_value: JSON.stringify(data),
      },
    });
    return this.settingToAlertSetting(setting);
  }

  async update(id: string, data: Partial<AlertSetting>): Promise<AlertSetting | null> {
    try {
      const setting = await this.prisma.user_preferences.update({
        where: { id },
        data: {
          setting_value: JSON.stringify(data),
        },
      });
      return this.settingToAlertSetting(setting);
    } catch {
      return null;
    }
  }

  async remove(id: string): Promise<void> {
    await this.prisma.user_preferences.delete({
      where: { id },
    });
  }

  // Service interface methods
  async list(user_id: string): Promise<AlertSetting[]> {
    const settings = await this.prisma.user_preferences.findMany({
      where: {
        user_id,
        category: 'alert_settings',
      },
    });
    return settings.map((setting) => this.settingToAlertSetting(setting));
  }

  async get(user_id: string, key: string): Promise<AlertSetting | null> {
    const setting = await this.prisma.user_preferences.findFirst({
      where: {
        user_id,
        category: 'alert_settings',
        setting_key: key,
      },
    });
    if (!setting) return null;
    return this.settingToAlertSetting(setting);
  }

  async set(
    user_id: string,
    key: string,
    value: any,
    is_enabled: boolean,
    updatedBy?: string,
  ): Promise<AlertSetting> {
    const settingValue = JSON.stringify({
      value,
      is_enabled,
      updated_by: updatedBy,
    });

    const setting = await this.prisma.user_preferences.upsert({
      where: {
        user_id_category_setting_key: {
          user_id,
          category: 'alert_settings',
          setting_key: key,
        },
      },
      update: {
        setting_value: settingValue,
      },
      create: {
        user_id,
        category: 'alert_settings',
        setting_key: key,
        setting_value: settingValue,
      },
    });
    return this.settingToAlertSetting(setting);
  }

  async setToggle(
    user_id: string,
    key: string,
    enabled: boolean,
    updatedBy?: string,
  ): Promise<AlertSetting> {
    const existing = await this.get(user_id, key);
    const currentValue = existing ? JSON.parse(existing.value || '{}') : {};

    return this.set(user_id, key, currentValue, enabled, updatedBy);
  }

  private settingToAlertSetting(setting: user_preferences): AlertSetting {
    const data = JSON.parse(setting.setting_value);
    return {
      id: setting.id,
      user_id: setting.user_id,
      key: setting.setting_key,
      value: data.value || null,
      is_enabled: data.is_enabled ?? true,
      is_overridden: data.is_overridden ?? false,
      overridden_at: data.overridden_at || null,
    };
  }
}
