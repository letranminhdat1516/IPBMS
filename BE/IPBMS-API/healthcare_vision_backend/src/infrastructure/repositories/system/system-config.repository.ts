import { BadRequestException, Injectable } from '@nestjs/common';
import { BasePrismaRepository } from '../shared/base-prisma.repository';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { SystemSetting } from '../../../core/entities/system_config.entity';

@Injectable()
export class SystemConfigRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async getSystemSetting(key: string): Promise<SystemSetting | null> {
    const result = await this.prisma.system_config.findUnique({ where: { setting_key: key } });
    return result as SystemSetting | null;
  }

  // Update only setting_value; avoid changing data_type
  async setSystemSetting(key: string, value: string, updatedBy?: string): Promise<SystemSetting> {
    if (value === undefined || value === null) {
      throw new BadRequestException('value is required');
    }

    const updateData = {
      setting_value: value,
      updated_at: new Date(),
    };

    if (updatedBy?.trim()) {
      return (await this.prisma.system_config.upsert({
        where: { setting_key: key },
        update: updateData,
        create: {
          setting_key: key,
          setting_value: value,
          updated_by: updatedBy.trim(),
        },
      })) as unknown as SystemSetting;
    }

    throw new BadRequestException('updated_by (user_id) is required to create new setting');
  }

  async listSystemSettings(): Promise<SystemSetting[]> {
    const result = await super.paginate<SystemSetting>('system_config', {
      orderBy: { setting_key: 'asc' },
      take: 1000,
    });
    return result.data as SystemSetting[];
  }

  // Service interface methods
  async get(key: string): Promise<SystemSetting | null> {
    return this.getSystemSetting(key);
  }

  async set(key: string, value: string, updatedBy?: string): Promise<SystemSetting> {
    return this.setSystemSetting(key, value, updatedBy);
  }

  async list(): Promise<SystemSetting[]> {
    return this.listSystemSettings();
  }

  async upsert2faCode(userId: string, code: string): Promise<SystemSetting> {
    const settingKey = `2fa_${userId}`;
    return (await this.prisma.system_config.upsert({
      where: { setting_key: settingKey },
      update: {
        setting_value: code,
        updated_at: new Date(Date.now() + 5 * 60 * 1000),
      },
      create: {
        setting_key: settingKey,
        setting_value: code,
        category: 'security',
        data_type: 'string',
        updated_at: new Date(Date.now() + 5 * 60 * 1000),
        updated_by: userId,
      },
    })) as unknown as SystemSetting;
  }

  async find2faCode(userId: string): Promise<SystemSetting | null> {
    const settingKey = `2fa_${userId}`;
    const result = await this.prisma.system_config.findFirst({
      where: { setting_key: settingKey },
    });
    return result as SystemSetting | null;
  }

  async deleteExpired2faCodes(): Promise<number> {
    const result = await this.prisma.system_config.deleteMany({
      where: {
        setting_key: { startsWith: '2fa_' },
        updated_at: { lt: new Date() },
      },
    });
    return result.count;
  }

  async delete2faCode(userId: string): Promise<number> {
    const settingKey = `2fa_${userId}`;
    const result = await this.prisma.system_config.deleteMany({
      where: {
        setting_key: settingKey,
      },
    });
    return result.count;
  }
}
