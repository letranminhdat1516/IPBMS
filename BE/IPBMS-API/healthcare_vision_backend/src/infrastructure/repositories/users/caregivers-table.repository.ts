import { Injectable } from '@nestjs/common';
import { Caregiver } from '../../../core/entities/caregivers.entity';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

@Injectable()
export class CaregiversTableRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async findCaregiverIdByUserId(user_id: string): Promise<string | null> {
    const user = await this.prisma.users.findUnique({
      where: { user_id, role: 'caregiver' },
      select: { user_id: true },
    });
    return user?.user_id ?? null;
  }

  async findCaregiverById(caregiver_id: string): Promise<Caregiver | null> {
    const user = await this.prisma.users.findUnique({
      where: { user_id: caregiver_id, role: 'caregiver' },
    });
    return user as unknown as Caregiver | null;
  }

  async findCaregiverByUserId(user_id: string): Promise<Caregiver | null> {
    const user = await this.prisma.users.findUnique({
      where: { user_id, role: 'caregiver' },
    });
    return user as unknown as Caregiver | null;
  }
}
