import { Injectable, NotFoundException } from '@nestjs/common';
import { DailySummariesRepository } from '../../../infrastructure/repositories/reports/daily-summaries.repository';
import { DailySummary } from '../../../core/entities/daily_summaries.entity';

@Injectable()
export class DailySummariesService {
  constructor(private readonly repo: DailySummariesRepository) {}

  async findById(summary_id: string): Promise<DailySummary> {
    const summary = await this.repo.findSettingById(summary_id);
    if (!summary) throw new NotFoundException('Summary not found');
    return summary;
  }

  findAll(): Promise<DailySummary[]> {
    return this.repo.findAll();
  }

  async create(data: Partial<DailySummary>): Promise<DailySummary> {
    return this.repo.create(data);
  }

  async update(summary_id: string, data: Partial<DailySummary>): Promise<DailySummary> {
    const updated = await this.repo.update(summary_id, data);
    if (!updated) throw new NotFoundException('Summary not found');
    return updated;
  }

  async remove(summary_id: string) {
    return this.repo.remove(summary_id);
  }
}
