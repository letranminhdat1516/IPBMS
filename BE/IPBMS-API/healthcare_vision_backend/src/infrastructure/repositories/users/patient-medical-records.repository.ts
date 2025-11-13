import { Injectable } from '@nestjs/common';
import { patient_medical_histories } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

@Injectable()
export class PatientMedicalRecordsRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async findBySupplementId(supplement_id: string): Promise<patient_medical_histories | null> {
    const result = await this.prisma.patient_medical_histories.findFirst({
      where: { supplement_id },
    });
    return result as unknown as patient_medical_histories | null;
  }

  async upsert(
    supplement_id: string,
    data: Partial<patient_medical_histories>,
  ): Promise<patient_medical_histories> {
    const current = await this.findBySupplementId(supplement_id);
    if (!current) {
      const result = await this.prisma.patient_medical_histories.create({
        data: { supplement_id, ...data } as any,
      });
      return result as unknown as patient_medical_histories;
    }

    const result = await this.prisma.patient_medical_histories.update({
      where: { id: current.id },
      data: data as any,
    });
    return result as unknown as patient_medical_histories;
  }
}
