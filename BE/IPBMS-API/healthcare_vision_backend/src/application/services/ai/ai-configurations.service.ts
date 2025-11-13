import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AiConfiguration } from '../../../core/entities/ai_configurations.entity';
import { AiConfigurationsRepository } from '../../../infrastructure/repositories/ai/ai-configurations.repository';

@Injectable()
export class AiConfigurationsService {
  constructor(
    private readonly repo: AiConfigurationsRepository,
    private readonly prismaService: PrismaService,
  ) {}

  // Validate cấu hình AI: quota FPS, image settings, alert rules, notification
  async validateAIConfig(user_id: string, data: Partial<AiConfiguration>): Promise<void> {
    const ms =
      typeof data.model_settings === 'object' ? (data.model_settings as Record<string, any>) : {};
    const br =
      typeof data.behavior_rules === 'object' ? (data.behavior_rules as Record<string, any>) : {};
    // Kiểm tra quota FPS
    if (ms.fps !== undefined) {
      // TODO: Check quota_fps_max from appropriate table (maybe subscriptions or license)
      const quota = 30; // Default quota
      if (ms.fps > quota) {
        throw new Error(`Quota FPS exceeded: ${ms.fps}/${quota}`);
      }
    }
    // Validate image settings (ROI, rotate, resize, codec)
    if (ms.roi !== undefined && !Array.isArray(ms.roi)) {
      throw new Error('ROI must be an array');
    }
    if (ms.codec !== undefined && typeof ms.codec !== 'string') {
      throw new Error('Codec must be a string');
    }
    // Validate alert rules
    if (br.alerts !== undefined && !Array.isArray(br.alerts)) {
      throw new Error('Alert rules must be an array');
    }
    // Validate notification channels
    if (ms.notification !== undefined && !Array.isArray(ms.notification)) {
      throw new Error('Notification channels must be an array');
    }
  }

  async findById(config_id: string): Promise<AiConfiguration> {
    const config = await this.repo.findConfigById(config_id);
    if (!config) throw new NotFoundException('AI configuration not found');
    return config;
  }

  findAll(): Promise<AiConfiguration[]> {
    return this.repo.findAll();
  }

  async create(data: Partial<AiConfiguration>): Promise<AiConfiguration> {
    return this.repo.create(data);
  }

  async update(config_id: string, data: Partial<AiConfiguration>): Promise<AiConfiguration> {
    const updated = await this.repo.update(config_id, data);
    if (!updated) throw new NotFoundException('AI configuration not found');
    return updated;
  }

  async remove(config_id: string) {
    return this.repo.remove(config_id);
  }
}
