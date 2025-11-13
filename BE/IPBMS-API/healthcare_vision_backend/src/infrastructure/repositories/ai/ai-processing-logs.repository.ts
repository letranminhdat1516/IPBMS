import { Injectable } from '@nestjs/common';
import { BasePrismaRepository } from '../shared/base-prisma.repository';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import type { user_preferences } from '@prisma/client';
import { AiProcessingLog } from '../../../core/entities/ai_processing_logs.entity';

@Injectable()
export class AiProcessingLogsRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async findLogById(id: string): Promise<AiProcessingLog | null> {
    const setting = await super.findById<user_preferences>('user_preferences', id);
    if (!setting) return null;
    return this.settingToAiProcessingLog(setting);
  }

  async findAll(): Promise<AiProcessingLog[]> {
    const settings = await this.prisma.user_preferences.findMany({
      where: {
        category: 'ai_processing_logs',
      },
    });
    return settings.map((setting) => this.settingToAiProcessingLog(setting));
  }

  async create(data: Partial<AiProcessingLog>): Promise<AiProcessingLog> {
    const setting = await this.prisma.user_preferences.create({
      data: {
        user_id: data.user_id!,
        category: 'ai_processing_logs',
        setting_key: data.log_id!,
        setting_value: JSON.stringify(data),
      },
    });
    return this.settingToAiProcessingLog(setting);
  }

  async update(id: string, data: Partial<AiProcessingLog>): Promise<AiProcessingLog | null> {
    try {
      const setting = await this.prisma.user_preferences.update({
        where: { id },
        data: {
          setting_value: JSON.stringify(data),
        },
      });
      return this.settingToAiProcessingLog(setting);
    } catch {
      return null;
    }
  }

  async remove(id: string): Promise<void> {
    await this.prisma.user_preferences.delete({
      where: { id },
    });
  }

  private settingToAiProcessingLog(setting: user_preferences): AiProcessingLog {
    const data = JSON.parse(setting.setting_value);
    return {
      log_id: setting.id,
      user_id: setting.user_id,
      ...data,
    };
  }
}
