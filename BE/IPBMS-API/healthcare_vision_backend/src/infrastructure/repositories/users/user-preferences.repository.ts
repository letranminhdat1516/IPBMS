import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

@Injectable()
export class UserPreferencesRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async list(user_id: string, category?: string) {
    return this.prisma.user_preferences.findMany({
      where: category ? { user_id, category } : { user_id },
      orderBy: { setting_key: 'asc' },
    });
  }

  async get(user_id: string, category?: string, setting_key?: string) {
    const hasCategory = !!category && category.trim().length > 0;

    if (hasCategory) {
      // Composite unique: (user_id, category, setting_key)
      return this.prisma.user_preferences.findUnique({
        where: {
          user_id_category_setting_key: {
            user_id,
            category: category!, // lúc này chắc chắn là string
            setting_key: setting_key!, // đảm bảo truyền đúng
          },
        },
      });
    }

    // Legacy: không có category -> tìm theo user_id + setting_key, KHÔNG set category trong where
    return this.prisma.user_preferences.findFirst({
      where: {
        user_id,
        setting_key: setting_key!,
        // KHÔNG viết { category: null } vì TS không cho; nếu bạn muốn bắt bản ghi category rỗng:
        // OR: [{ category: '' }],  // chỉ khi bạn cần
      },
      orderBy: { overridden_at: 'desc' as const },
    });
  }

  async set(
    user_id: string,
    category: string,
    key: string,
    value?: string | null,
    is_enabled?: boolean,
    _updatedBy?: string,
  ): Promise<any> {
    const existing = await this.get(user_id, category, key);

    if (!existing) {
      return this.prisma.user_preferences.create({
        data: {
          user_id,
          category,
          setting_key: key,
          setting_value: value || '',
          is_enabled: typeof is_enabled === 'boolean' ? is_enabled : true,
          is_overridden: true,
          overridden_at: new Date(),
        },
      });
    }

    const updateData: any = {};
    if (value !== undefined) {
      updateData.setting_value = value || '';
      updateData.is_overridden = true;
      updateData.overridden_at = new Date();
    }

    if (typeof is_enabled === 'boolean') {
      updateData.is_enabled = is_enabled;
      updateData.is_overridden = true;
      updateData.overridden_at = new Date();
    }

    return this.prisma.user_preferences.update({
      where: {
        user_id_category_setting_key: {
          user_id,
          category,
          setting_key: key,
        },
      },
      data: updateData,
    });
  }

  async setToggle(
    user_id: string,
    category: string,
    key: string,
    enabled: boolean,
    _updatedBy?: string,
  ) {
    return this.set(user_id, category, key, undefined, enabled, _updatedBy);
  }
}
