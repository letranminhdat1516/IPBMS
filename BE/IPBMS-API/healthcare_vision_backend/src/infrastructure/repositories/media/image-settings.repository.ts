import { Injectable } from '@nestjs/common';
import { BasePrismaRepository } from '../shared/base-prisma.repository';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import type { user_preferences } from '@prisma/client';
import { ImageSetting } from '../../../core/entities/image_settings.entity';

@Injectable()
export class ImageSettingsRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async list(user_id: string): Promise<ImageSetting[]> {
    const settings = await this.prisma.user_preferences.findMany({
      where: {
        user_id,
        category: 'image_settings',
      },
    });
    return settings.map((setting) => this.settingToImageSetting(setting));
  }

  async get(user_id: string, key: string): Promise<ImageSetting | null> {
    const setting = await this.prisma.user_preferences.findFirst({
      where: {
        user_id,
        category: 'image_settings',
        setting_key: key,
      },
    });
    if (!setting) return null;
    return this.settingToImageSetting(setting);
  }

  async set(
    user_id: string,
    key: string,
    value: any,
    is_enabled: boolean,
    updatedBy?: string,
  ): Promise<ImageSetting> {
    const settingValue = JSON.stringify({
      value,
      is_enabled,
      updated_by: updatedBy,
    });

    const setting = await this.prisma.user_preferences.upsert({
      where: {
        user_id_category_setting_key: {
          user_id,
          category: 'image_settings',
          setting_key: key,
        },
      },
      update: {
        setting_value: settingValue,
      },
      create: {
        user_id,
        category: 'image_settings',
        setting_key: key,
        setting_value: settingValue,
      },
    });
    return this.settingToImageSetting(setting);
  }

  async setToggle(
    user_id: string,
    key: string,
    enabled: boolean,
    updatedBy?: string,
  ): Promise<ImageSetting> {
    const existing = await this.get(user_id, key);
    const currentValue = existing ? JSON.parse(existing.value || '{}') : {};

    return this.set(user_id, key, currentValue, enabled, updatedBy);
  }

  private settingToImageSetting(setting: user_preferences): ImageSetting {
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
