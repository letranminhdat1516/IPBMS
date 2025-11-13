import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

@Injectable()
export class CustomersRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async create(data: { user_id: string; phone_number?: string }) {
    return this.prisma.users.create({
      data: {
        user_id: data.user_id,
        role: 'customer',
        phone_number: data.phone_number,
        // Add other required fields if needed
        username: '', // placeholder
        email: '', // placeholder
        password_hash: '', // placeholder
        full_name: '', // placeholder
      },
    });
  }
}
