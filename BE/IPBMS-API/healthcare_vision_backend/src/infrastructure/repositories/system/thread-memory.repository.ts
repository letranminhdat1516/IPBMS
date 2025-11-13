import { Injectable } from '@nestjs/common';
import { BasePrismaRepository } from '../shared/base-prisma.repository';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import type { user_preferences } from '@prisma/client';
import { ThreadMemory } from '../../../core/entities/thread_memory.entity';

@Injectable()
export class ThreadMemoryRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async findThreadById(id: string): Promise<ThreadMemory | null> {
    const setting = await super.findById<user_preferences>('user_preferences', id);
    if (!setting) return null;
    return this.settingToThreadMemory(setting);
  }

  async findAll(): Promise<ThreadMemory[]> {
    const settings = await this.prisma.user_preferences.findMany({
      where: {
        category: 'thread_memory',
      },
    });
    return settings.map((setting) => this.settingToThreadMemory(setting));
  }

  async create(data: Partial<ThreadMemory>): Promise<ThreadMemory> {
    const setting = await this.prisma.user_preferences.create({
      data: {
        user_id: data.user_id!,
        category: 'thread_memory',
        setting_key: data.thread_id!,
        setting_value: JSON.stringify(data),
      },
    });
    return this.settingToThreadMemory(setting);
  }

  async update(id: string, data: Partial<ThreadMemory>): Promise<ThreadMemory | null> {
    try {
      const setting = await this.prisma.user_preferences.update({
        where: { id },
        data: {
          setting_value: JSON.stringify(data),
        },
      });
      return this.settingToThreadMemory(setting);
    } catch {
      return null;
    }
  }

  async remove(id: string): Promise<void> {
    await this.prisma.user_preferences.delete({
      where: { id },
    });
  }

  private settingToThreadMemory(setting: user_preferences): ThreadMemory {
    const data = JSON.parse(setting.setting_value);
    return {
      thread_id: setting.id,
      user_id: setting.user_id,
      conversation_history: data.conversation_history,
      context_cache: data.context_cache,
      last_updated: data.last_updated || new Date(),
      expires_at: data.expires_at,
      is_active: data.is_active ?? true,
    };
  }
}
