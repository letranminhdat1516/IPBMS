import { Injectable } from '@nestjs/common';
import { BasePrismaRepository } from '../shared/base-prisma.repository';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import type { user_preferences } from '@prisma/client';
import { AiConfiguration } from '../../../core/entities/ai_configurations.entity';

@Injectable()
export class AiConfigurationsRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async findConfigById(id: string): Promise<AiConfiguration | null> {
    const setting = await super.findById<user_preferences>('user_preferences', id);
    if (!setting) return null;
    return this.settingToAiConfiguration(setting);
  }

  async findAll(): Promise<AiConfiguration[]> {
    const settings = await this.prisma.user_preferences.findMany({
      where: {
        category: 'ai_configurations',
      },
    });
    return settings.map((setting) => this.settingToAiConfiguration(setting));
  }

  async create(data: Partial<AiConfiguration>): Promise<AiConfiguration> {
    const setting = await this.prisma.user_preferences.create({
      data: {
        user_id: data.user_id!,
        category: 'ai_configurations',
        setting_key: data.config_id!,
        setting_value: JSON.stringify(data),
      },
    });
    return this.settingToAiConfiguration(setting);
  }

  async update(id: string, data: Partial<AiConfiguration>): Promise<AiConfiguration | null> {
    try {
      const setting = await this.prisma.user_preferences.update({
        where: { id },
        data: {
          setting_value: JSON.stringify(data),
        },
      });
      return this.settingToAiConfiguration(setting);
    } catch {
      return null;
    }
  }

  async remove(id: string): Promise<void> {
    await this.prisma.user_preferences.delete({
      where: { id },
    });
  }

  private settingToAiConfiguration(setting: user_preferences): AiConfiguration {
    const data = JSON.parse(setting.setting_value);
    return {
      config_id: setting.id,
      user_id: setting.user_id,
      ...data,
    };
  }
}
