import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { User } from '../../../core/entities/users.entity';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

@Injectable()
export class CaregiversRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async findCaregiverById(user_id: string): Promise<User | null> {
    const result = await this.prisma.users.findFirst({
      where: {
        user_id,
        role: 'caregiver' as any,
      },
    });
    return result as unknown as User | null;
  }

  async findAll(): Promise<User[]> {
    const result = await this.prisma.users.findMany({
      where: { role: 'caregiver' as any },
    });
    return result as unknown as User[];
  }

  async remove(user_id: string): Promise<any> {
    return this.prisma.users.deleteMany({
      where: {
        user_id,
        role: 'caregiver' as any,
      },
    });
  }

  async search(keyword: string): Promise<User[]> {
    // Normalize phone number for search (remove +84 prefix and leading 0)
    const normalizedKeyword = keyword.replace(/^\+?84|^0/, '');

    const result = await this.prisma.users.findMany({
      where: {
        role: 'caregiver' as any,
        OR: [
          { username: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
          { full_name: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
          { phone_number: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
          { phone_number: { contains: normalizedKeyword, mode: Prisma.QueryMode.insensitive } },
        ],
      },
    });
    return result as unknown as User[];
  }

  async create(data: Partial<User>): Promise<User> {
    const result = await this.prisma.users.create({
      data: {
        ...data,
        role: 'caregiver' as any,
      } as Prisma.usersCreateInput,
    });
    return result as unknown as User;
  }

  async update(user_id: string, data: Partial<User>): Promise<User | null> {
    return this.prisma.users
      .updateMany({
        where: {
          user_id,
          role: 'caregiver' as any,
        },
        data: data as Prisma.usersUpdateInput,
      })
      .then(() => this.findCaregiverById(user_id));
  }

  // Pagination helpers mirroring UsersRepository but scoped to caregivers
  async paginateWithWhere(where: any, page = 1, limit = 20, order: any = { created_at: 'desc' }) {
    const roleWhere = { ...(where || {}), role: 'caregiver' as any };
    const [data, total] = await Promise.all([
      this.prisma.users.findMany({
        where: roleWhere,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: order,
      }),
      this.prisma.users.count({ where: roleWhere }),
    ]);
    return { data: data as unknown as User[], total, page, limit };
  }

  async paginateWithSearch(
    keyword: string,
    page = 1,
    limit = 20,
    order: any = { created_at: 'desc' },
  ) {
    // Normalize phone number for search (remove +84 prefix and leading 0)
    const normalizedKeyword = keyword.replace(/^\+?84|^0/, '');

    const where = {
      role: 'caregiver' as any,
      OR: [
        { username: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
        { email: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
        { full_name: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
        { phone_number: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
        { phone_number: { contains: normalizedKeyword, mode: Prisma.QueryMode.insensitive } },
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.users.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: order,
      }),
      this.prisma.users.count({ where }),
    ]);

    return { data: data as unknown as User[], total, page, limit };
  }

  async findAllWithOptions(where: any = {}, order: any = { created_at: 'desc' }): Promise<User[]> {
    const roleWhere = { ...where, role: 'caregiver' as any };
    const result = await this.prisma.users.findMany({
      where: roleWhere,
      orderBy: order,
    });
    return result as unknown as User[];
  }

  async paginateDynamic(options: { where?: any; page?: number; limit?: number; order?: any }) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? options.limit : 20;
    const roleWhere = { ...(options.where || {}), role: 'caregiver' as any };

    const [data, total] = await Promise.all([
      this.prisma.users.findMany({
        where: roleWhere,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: options.order,
      }),
      this.prisma.users.count({ where: roleWhere }),
    ]);

    return { data: data as unknown as User[], total, page, limit };
  }
}
