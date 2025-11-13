import { Injectable } from '@nestjs/common';
import { BasePrismaRepository } from '../shared/base-prisma.repository';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import type { user_preferences } from '@prisma/client';
import { CameraSetting } from '../../../core/entities/camera_settings.entity';

@Injectable()
export class CameraSettingsRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async findSettingById(id: string): Promise<CameraSetting | null> {
    const setting = await super.findById<user_preferences>('user_preferences', id);
    if (!setting) return null;
    return this.settingToCameraSetting(setting);
  }

  async findAll(): Promise<CameraSetting[]> {
    const settings = await this.prisma.user_preferences.findMany({
      where: {
        category: 'camera_settings',
      },
    });
    return settings.map((setting) => this.settingToCameraSetting(setting));
  }

  async create(data: Partial<CameraSetting>): Promise<CameraSetting> {
    const setting = await this.prisma.user_preferences.create({
      data: {
        user_id: data.camera_id!, // Using camera_id as user_id for camera settings
        category: 'camera_settings',
        setting_key: data.setting_name!,
        setting_value: JSON.stringify(data),
      },
    });
    return this.settingToCameraSetting(setting);
  }

  async update(id: string, data: Partial<CameraSetting>): Promise<CameraSetting | null> {
    try {
      const setting = await this.prisma.user_preferences.update({
        where: { id },
        data: {
          setting_value: JSON.stringify(data),
        },
      });
      return this.settingToCameraSetting(setting);
    } catch {
      return null;
    }
  }

  async remove(id: string): Promise<void> {
    await this.prisma.user_preferences.delete({
      where: { id },
    });
  }

  private settingToCameraSetting(setting: user_preferences): CameraSetting {
    const data = JSON.parse(setting.setting_value);
    return {
      setting_id: setting.id,
      camera_id: setting.user_id,
      setting_name: setting.setting_key,
      setting_value: data.setting_value || null,
      data_type: data.data_type || 'string',
      description: data.description || null,
      is_active: data.is_active ?? true,
      created_at: data.created_at || new Date(),
      updated_at: data.updated_at || new Date(),
    };
  }
}
