import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { emergency_contacts } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

@Injectable()
export class EmergencyContactsRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  /**
   * List emergency contacts by user ID
   */
  async listByUserId(userId: string): Promise<emergency_contacts[]> {
    return this.prisma.emergency_contacts.findMany({
      where: {
        user_id: userId,
        is_deleted: false,
      },
      orderBy: [{ alert_level: 'asc' }, { created_at: 'asc' }],
    });
  }

  /**
   * Get emergency contact by ID and user ID
   */
  async findByIdAndUserId(id: string, userId: string): Promise<emergency_contacts | null> {
    return this.prisma.emergency_contacts.findFirst({
      where: {
        id,
        user_id: userId,
        is_deleted: false,
      },
    });
  }

  /**
   * Count active emergency contacts for a user
   */
  async countByUserId(userId: string): Promise<number> {
    return this.prisma.emergency_contacts.count({
      where: {
        user_id: userId,
        is_deleted: false,
      },
    });
  }

  /**
   * Check if phone number already exists for user
   */
  async phoneExistsForUser(userId: string, phone: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.emergency_contacts.count({
      where: {
        user_id: userId,
        phone: phone,
        is_deleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return count > 0;
  }

  /**
   * Create emergency contact
   */
  async create(
    userId: string,
    data: Pick<emergency_contacts, 'name' | 'relation' | 'phone' | 'alert_level'>,
  ): Promise<emergency_contacts> {
    // Check if user already has 2 contacts
    const count = await this.countByUserId(userId);
    if (count >= 2) {
      throw new BadRequestException('Maximum 2 emergency contacts allowed per user');
    }

    // Check if phone already exists
    const phoneExists = await this.phoneExistsForUser(userId, data.phone);
    if (phoneExists) {
      throw new BadRequestException('Phone number already exists for this user');
    }

    return this.prisma.emergency_contacts.create({
      data: {
        user_id: userId,
        name: data.name,
        relation: data.relation,
        phone: data.phone,
        alert_level: data.alert_level,
      },
    });
  }

  /**
   * Update emergency contact
   */
  async update(
    id: string,
    userId: string,
    data: Partial<Pick<emergency_contacts, 'name' | 'relation' | 'phone' | 'alert_level'>>,
  ): Promise<emergency_contacts> {
    const current = await this.findByIdAndUserId(id, userId);
    if (!current) {
      throw new NotFoundException('Emergency contact not found');
    }

    // Check if phone already exists (excluding current contact)
    if (data.phone && data.phone !== current.phone) {
      const phoneExists = await this.phoneExistsForUser(userId, data.phone, id);
      if (phoneExists) {
        throw new BadRequestException('Phone number already exists for this user');
      }
    }

    return this.prisma.emergency_contacts.update({
      where: { id },
      data: {
        name: data.name,
        relation: data.relation,
        phone: data.phone,
        alert_level: data.alert_level,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Soft delete emergency contact
   */
  async softDeleteContact(id: string, userId: string): Promise<{ deleted: boolean }> {
    const current = await this.findByIdAndUserId(id, userId);
    if (!current) {
      throw new NotFoundException('Emergency contact not found');
    }

    await this.prisma.emergency_contacts.update({
      where: { id },
      data: {
        is_deleted: true,
        updated_at: new Date(),
      },
    });

    return { deleted: true };
  }

  /**
   * Hard delete emergency contact (for cleanup)
   */
  async hardDeleteContact(id: string, userId: string): Promise<{ deleted: boolean }> {
    const current = await this.findByIdAndUserId(id, userId);
    if (!current) {
      throw new NotFoundException('Emergency contact not found');
    }

    await this.prisma.emergency_contacts.delete({
      where: { id },
    });

    return { deleted: true };
  }
}
