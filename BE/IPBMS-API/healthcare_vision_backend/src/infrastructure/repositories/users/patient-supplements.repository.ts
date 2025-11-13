import { Injectable } from '@nestjs/common';
import { patient_supplements } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

@Injectable()
export class PatientSupplementsRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  // Upsert thông tin bổ sung của người dùng
  /**
   * Nếu không có id riêng cho patient, user_id sẽ là id của customer và lưu customer_id vào patient_supplements.
   * Nếu có id riêng cho patient, sẽ lưu đúng user_id và customer_id.
   */
  async upsert(customer_id: string, data: any): Promise<patient_supplements> {
    const existing = await this.findByCustomerId(customer_id);

    if (existing) {
      const result = await this.prisma.patient_supplements.update({
        where: { id: existing.id },
        data: { ...data, customer_id },
      });
      return result as unknown as patient_supplements;
    } else {
      const createData = { ...data, customer_id } as any;
      // Ensure doctors JSON is passed correctly to Prisma types
      if (createData.doctors === undefined) delete createData.doctors;
      const result = await this.prisma.patient_supplements.create({
        data: createData,
      });
      return result as unknown as patient_supplements;
    }
  }

  // Xóa thông tin bổ sung của người dùng
  async remove(customer_id: string): Promise<patient_supplements> {
    const current = await this.findByCustomerId(customer_id);
    if (!current) throw new Error('Patient not found');

    const result = await this.prisma.patient_supplements.delete({
      where: { id: current.id },
    });
    return result as unknown as patient_supplements;
  }

  // Cập nhật avatar
  // avatar handling removed (avatar_url not used)

  // Tìm supplement theo customer_id
  async findByCustomerId(customer_id: string): Promise<patient_supplements | null> {
    const result = await this.prisma.patient_supplements.findFirst({
      where: { customer_id },
    });
    return result as unknown as patient_supplements | null;
  }

  // Find all supplements for a customer
  async findManyByCustomerId(customer_id: string): Promise<patient_supplements[]> {
    const results = await this.prisma.patient_supplements.findMany({
      where: { customer_id },
      orderBy: { created_at: 'asc' },
    });
    return results as unknown as patient_supplements[];
  }

  // Create a new supplement for a customer
  async createForCustomer(customer_id: string, data: any): Promise<patient_supplements> {
    const createData = { ...data, customer_id } as any;
    if (createData.doctors === undefined) delete createData.doctors;
    const result = await this.prisma.patient_supplements.create({ data: createData });
    return result as unknown as patient_supplements;
  }

  // Update specific supplement by its id
  async updateBySupplementId(supplement_id: string, data: any): Promise<patient_supplements> {
    const updateData = { ...data } as any;
    if (updateData.doctors === undefined) delete updateData.doctors;
    const result = await this.prisma.patient_supplements.update({
      where: { id: supplement_id },
      data: updateData,
    });
    return result as unknown as patient_supplements;
  }

  // Remove specific supplement by its id
  async removeBySupplementId(supplement_id: string): Promise<patient_supplements> {
    const result = await this.prisma.patient_supplements.delete({ where: { id: supplement_id } });
    return result as unknown as patient_supplements;
  }

  // Tìm supplement theo supplement_id
  async findBySupplementId(supplement_id: string): Promise<patient_supplements | null> {
    const result = await this.prisma.patient_supplements.findUnique({
      where: { id: supplement_id },
    });
    return result as unknown as patient_supplements | null;
  }
}
