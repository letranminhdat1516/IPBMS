import { Injectable, NotFoundException } from '@nestjs/common';
import { CameraSettingsRepository } from '../../../infrastructure/repositories/devices/camera-settings.repository';
import { CameraSetting } from '../../../core/entities/camera_settings.entity';

@Injectable()
export class CameraSettingsService {
  constructor(private readonly repo: CameraSettingsRepository) {}

  async findById(setting_id: string): Promise<CameraSetting> {
    const setting = await this.repo.findSettingById(setting_id);
    if (!setting) throw new NotFoundException('Camera setting not found');
    return setting;
  }

  findAll(): Promise<CameraSetting[]> {
    return this.repo.findAll();
  }

  async create(data: Partial<CameraSetting>): Promise<CameraSetting> {
    return this.repo.create(data);
  }

  async update(setting_id: string, data: Partial<CameraSetting>): Promise<CameraSetting> {
    const updated = await this.repo.update(setting_id, data);
    if (!updated) throw new NotFoundException('Camera setting not found');
    return updated;
  }

  async remove(setting_id: string) {
    return this.repo.remove(setting_id);
  }
}
