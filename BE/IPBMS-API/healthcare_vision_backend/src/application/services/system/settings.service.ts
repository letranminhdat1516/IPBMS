// src/modules/settings/settings.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SystemConfigRepository } from '../../../infrastructure/repositories/system/system-config.repository';

@Injectable()
export class SettingsService {
  constructor(private readonly repo: SystemConfigRepository) {}

  async get(key: string) {
    const setting = await this.repo.get(key);
    if (!setting) throw new NotFoundException('Setting not found');
    return setting;
  }

  set(key: string, value: string, updatedBy?: string) {
    // Validate user_id nếu có truyền vào
    if (key === 'user_id' && value) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new BadRequestException('user_id must be a valid UUID');
      }
    }
    return this.repo.set(key, value, updatedBy);
  }

  list() {
    return this.repo.list();
  }
}
