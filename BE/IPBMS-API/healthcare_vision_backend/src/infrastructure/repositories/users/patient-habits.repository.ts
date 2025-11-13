import { Injectable } from '@nestjs/common';
import { patient_habits } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

@Injectable()
export class PatientHabitsRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  // Trả về danh sách thói quen của customer, mới nhất trước
  async findBySupplementId(supplement_id: string): Promise<patient_habits[]> {
    const result = await this.prisma.patient_habits.findMany({
      where: { supplement_id },
      orderBy: { created_at: 'desc' },
    });
    return result as unknown as patient_habits[];
  }

  // Upsert theo habit_id (nếu có). Nếu không có habit_id -> tạo mới habit cho customer.
  async upsert(supplement_id: string, data: Partial<patient_habits>): Promise<patient_habits> {
    // If supplement_id provided, ensure user_id aligns with patient_supplements.customer_id
    if (supplement_id) {
      try {
        const supp = await this.prisma.patient_supplements.findUnique({
          where: { id: supplement_id },
          select: { customer_id: true },
        });
        if (supp && supp.customer_id) {
          // prefer existing provided user_id only if it matches, otherwise overwrite to ensure consistency
          if (!data.user_id || data.user_id !== supp.customer_id) {
            data.user_id = supp.customer_id as any;
          }
        }
      } catch {
        // ignore lookup errors and proceed (fallback to whatever data.user_id contains)
      }
    }
    // If explicit habit_id present, behave as upsert by PK
    if (data.habit_id) {
      const result = await this.prisma.patient_habits.upsert({
        where: { habit_id: data.habit_id },
        update: data as any,
        create: { supplement_id, ...data } as any,
      });
      return result as unknown as patient_habits;
    }

    // If no habit_id provided, enforce one habit per supplement_id.
    // Try to find an existing habit for this supplement_id and update it.
    if (supplement_id) {
      const existing = await this.prisma.patient_habits.findFirst({
        where: { supplement_id },
        orderBy: { created_at: 'desc' },
      });
      if (existing) {
        const updated = await this.prisma.patient_habits.update({
          where: { habit_id: existing.habit_id },
          data: { ...data, updated_at: new Date() } as any,
        });
        return updated as unknown as patient_habits;
      }
    }

    // No existing habit -> create a new one associated with supplement_id
    const created = await this.prisma.patient_habits.create({
      data: { supplement_id, ...data } as any,
    });
    return created as unknown as patient_habits;
  }

  // Xóa thói quen theo customer_id và habit_id
  async remove(supplement_id: string, habit_id: string): Promise<{ deleted: boolean }> {
    await this.prisma.patient_habits.delete({
      where: { habit_id },
    });
    return { deleted: true };
  }

  // Lấy danh sách thói quen theo customer_id (chuẩn hóa lại cho đúng entity)
  async listBySupplementId(supplement_id: string): Promise<patient_habits[]> {
    const result = await this.prisma.patient_habits.findMany({
      where: { supplement_id },
      orderBy: { created_at: 'desc' },
    });
    return result as unknown as patient_habits[];
  }
}
