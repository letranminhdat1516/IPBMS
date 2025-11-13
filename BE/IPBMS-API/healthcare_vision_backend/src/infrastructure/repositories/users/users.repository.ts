import { Injectable } from '@nestjs/common';
import { User } from '../../../core/entities/users.entity';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

@Injectable()
export class UsersRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async findUserById(user_id: string): Promise<User | null> {
    return super.findById<User>('users', user_id);
  }

  async findAllUsers(): Promise<User[]> {
    const result = await super.paginate<User>('users', { take: 1000 });
    return result.data as User[];
  }

  async findUsersByIds(ids: string[]): Promise<User[]> {
    return super.findManyByIds<User>('users', ids);
  }

  async removeUser(user_id: string): Promise<{ deleted: boolean }> {
    try {
      await super.hardDelete<User>('users', user_id);
      return { deleted: true };
    } catch {
      return { deleted: false };
    }
  }

  async softDeleteUser(user_id: string): Promise<{ deleted: boolean }> {
    try {
      await this.prisma.users.update({
        where: { user_id },
        data: { is_active: false },
      });
      return { deleted: true };
    } catch {
      return { deleted: false };
    }
  }

  async search(keyword: string): Promise<User[]> {
    // Normalize phone number for search (remove +84 prefix and leading 0)
    const normalizedKeyword = keyword.replace(/^\+?84|^0/, '');

    return (await this.prisma.users.findMany({
      where: {
        OR: [
          { username: { contains: keyword } },
          { email: { contains: keyword } },
          { full_name: { contains: keyword } },
          { phone_number: { contains: keyword } },
          { phone_number: { contains: normalizedKeyword } },
        ],
      },
    })) as unknown as User[];
  }

  async findByPhone(phone_number: string): Promise<User | null> {
    return this.prisma.users.findFirst({
      where: { phone_number },
    }) as Promise<User | null>;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.users.findUnique({
      where: { email },
    }) as Promise<User | null>;
  }

  async createUser(data: Partial<User>): Promise<User> {
    return super.createRecord<User>('users', data);
  }

  async updateUser(user_id: string, data: Partial<User>): Promise<User | null> {
    return super.updateRecord<User>('users', user_id, data);
  }

  async paginateUsersWithWhere(
    where: any,
    page = 1,
    limit = 20,
    order: any = { created_at: 'desc' },
  ) {
    return super.paginate<User>('users', {
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: order,
    });
  }

  // Phân trang với search (tìm theo username, email, full_name, phone_number)
  async paginateWithSearch(
    keyword: string,
    page = 1,
    limit = 20,
    order: any = { created_at: 'desc' },
  ) {
    // Normalize phone number for search (remove +84 prefix and leading 0)
    const normalizedKeyword = keyword.replace(/^\+?84|^0/, '');

    const where = {
      OR: [
        { username: { contains: keyword } },
        { email: { contains: keyword } },
        { full_name: { contains: keyword } },
        { phone_number: { contains: keyword } },
        { phone_number: { contains: normalizedKeyword } },
      ],
    };

    const [data, total] = await Promise.all([
      (await this.prisma.users.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: order,
      })) as unknown as User[],
      this.prisma.users.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findAllUsersWithOptions(
    where: any = {},
    order: any = { created_at: 'desc' },
  ): Promise<User[]> {
    const result = await super.paginate<User>('users', {
      where,
      orderBy: order,
      take: 1000, // No pagination, get all
    });
    return result.data as User[];
  }

  async paginateUsersDynamic(options: { where?: any; page?: number; limit?: number; order?: any }) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? options.limit : 20;

    return super.paginate<User>('users', {
      where: options.where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: options.order,
    });
  }

  // Service interface method
  async findAll(): Promise<User[]> {
    return this.findAllUsers();
  }

  async findByIdPublic(user_id: string): Promise<User | null> {
    return this.findUserById(user_id);
  }

  async findUserByIdPublic(user_id: string): Promise<User | null> {
    return this.findUserById(user_id);
  }
}
