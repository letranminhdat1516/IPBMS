import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

@Injectable()
export class PlanRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly unitOfWork: UnitOfWork,
  ) {
    super(prismaService, unitOfWork);
  }

  /**
   * Find the current active version of a plan by its code
   *
   * @param code - The plan code to search for
   * @param include - Optional Prisma include options for related data
   * @returns The current active plan with the given code, or null if not found
   *
   * Compound key handling: Uses code + is_current filter to get the active version
   * since multiple versions of the same plan code can exist with @@unique([code, version])
   */
  async findByCode(code: string, include?: Prisma.plansInclude) {
    return this.prisma.plans.findFirst({
      where: { code, is_current: true },
      include,
    });
  }

  /**
   * Find all plan records (including all versions)
   *
   * @param include - Optional Prisma include options for related data
   * @returns Array of all plan records including inactive versions
   *
   * Note: This method returns ALL plan versions. For active plans only,
   * consider filtering with is_current: true in the where clause
   */
  async findAll(include?: Prisma.plansInclude) {
    return this.prisma.plans.findMany({
      include,
    });
  }

  /**
   * Find the current active version of a plan by its code within a transaction
   *
   * @param tx - The Prisma transaction client
   * @param code - The plan code to search for
   * @param include - Optional Prisma include options for related data
   * @returns The current active plan with the given code, or null if not found
   *
   * Compound key handling: Uses code + is_current filter to get the active version
   * since multiple versions of the same plan code can exist with @@unique([code, version])
   */
  async findByCodeInTransaction(
    tx: Prisma.TransactionClient,
    code: string,
    include?: Prisma.plansInclude,
  ) {
    return tx.plans.findFirst({
      where: { code, is_current: true },
      include,
    });
  }
}
