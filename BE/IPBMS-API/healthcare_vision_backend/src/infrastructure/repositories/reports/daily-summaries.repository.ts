import { Injectable } from '@nestjs/common';
import { BasePrismaRepository } from '../shared/base-prisma.repository';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import type { user_preferences } from '@prisma/client';
import { DailySummary } from '../../../core/entities/daily_summaries.entity';

@Injectable()
export class DailySummariesRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async findSettingById(id: string): Promise<DailySummary | null> {
    const setting = await super.findById<user_preferences>('user_preferences', id);
    if (!setting) return null;
    return this.settingToDailySummary(setting);
  }

  async findAll(): Promise<DailySummary[]> {
    const settings = await this.prisma.user_preferences.findMany({
      where: {
        category: 'daily_summaries',
      },
    });
    return settings.map((setting) => this.settingToDailySummary(setting));
  }

  async create(data: Partial<DailySummary>): Promise<DailySummary> {
    const setting = await this.prisma.user_preferences.create({
      data: {
        user_id: data.user_id!,
        category: 'daily_summaries',
        setting_key: data.summary_id!,
        setting_value: JSON.stringify(data),
      },
    });
    return this.settingToDailySummary(setting);
  }

  async update(id: string, data: Partial<DailySummary>): Promise<DailySummary | null> {
    try {
      const setting = await this.prisma.user_preferences.update({
        where: { id },
        data: {
          setting_value: JSON.stringify(data),
        },
      });
      return this.settingToDailySummary(setting);
    } catch {
      return null;
    }
  }

  async remove(id: string): Promise<void> {
    await this.prisma.user_preferences.delete({
      where: { id },
    });
  }

  private settingToDailySummary(setting: user_preferences): DailySummary {
    const data = JSON.parse(setting.setting_value);
    return {
      summary_id: setting.id,
      user_id: setting.user_id,
      ...data,
    };
  }
}
