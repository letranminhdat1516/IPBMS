import { Injectable } from '@nestjs/common';
import { CreateCaregiverDto } from '../../../application/dto/caregiver/create-caregiver.dto';
import { UpdateCaregiverDto } from '../../../application/dto/caregiver/update-caregiver.dto';
import { User } from '../../../core/entities/users.entity';
import type { PaginateOptions } from '../../../core/types/paginate.types';
import { AssignmentsRepository } from '../../../infrastructure/repositories/users/assignments.repository';
import { CaregiversRepository } from '../../../infrastructure/repositories/users/caregivers.repository';
import { UsersRepository } from '../../../infrastructure/repositories/users/users.repository';

@Injectable()
export class CaregiversService {
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly caregiversRepository: CaregiversRepository,
    // eslint-disable-next-line no-unused-vars
    private readonly usersRepository: UsersRepository,
    // eslint-disable-next-line no-unused-vars
    private readonly assignmentsRepository: AssignmentsRepository,
  ) {}

  async findAll(): Promise<User[]> {
    return this.caregiversRepository.findAll();
  }

  async findById(id: string): Promise<User | null> {
    return this.caregiversRepository.findCaregiverById(id);
  }

  async create(dto: CreateCaregiverDto): Promise<User> {
    // Create user with caregiver role
    const userData = {
      ...dto,
      role: 'caregiver' as any,
    };
    return this.caregiversRepository.create(userData);
  }

  async update(id: string, dto: UpdateCaregiverDto): Promise<User | null> {
    return this.caregiversRepository.update(id, dto);
  }

  async remove(id: string): Promise<any> {
    return this.caregiversRepository.remove(id);
  }

  async softDelete(id: string): Promise<any> {
    return this.usersRepository.softDeleteUser(id);
  }

  async paginateDynamic(options: PaginateOptions & { where?: any }): Promise<any> {
    return this.caregiversRepository.paginateDynamic({
      ...options,
      where: {
        role: 'caregiver',
        ...options.where,
      },
    });
  }

  async paginateWithSearch(
    keyword: string = '',
    page: number = 1,
    limit: number = 10,
    _order?: Record<string, 'ASC' | 'DESC'>,
  ): Promise<any> {
    // Get caregivers with search
    const caregivers = await this.caregiversRepository.search(keyword);

    // Get assignment statuses for each caregiver
    const caregiversWithStatus = await Promise.all(
      caregivers.map(async (caregiver) => {
        const assignments = await this.assignmentsRepository.findActive(caregiver.user_id);
        const hasActiveAssignment = assignments && assignments.length > 0;

        return {
          ...caregiver,
          assignment_status: hasActiveAssignment ? 'assigned' : 'available',
        };
      }),
    );

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = caregiversWithStatus.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total: caregiversWithStatus.length,
      page,
      limit,
      totalPages: Math.ceil(caregiversWithStatus.length / limit),
    };
  }

  async assignCaregiverToUser(caregiverId: string, userId: string): Promise<any> {
    // Check if caregiver exists
    const caregiver = await this.findById(caregiverId);
    if (!caregiver) {
      throw new Error('Caregiver not found');
    }

    // Check if user exists
    const user = await this.usersRepository.findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create assignment
    return this.assignmentsRepository.assign(caregiverId, userId);
  }
}
