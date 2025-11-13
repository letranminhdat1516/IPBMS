import { Injectable } from '@nestjs/common';
import { BasePrismaRepository } from '../shared/base-prisma.repository';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import type { user_preferences } from '@prisma/client';
import { UserRoomAssignment } from '../../../core/entities/user_room_assignments.entity';

@Injectable()
export class UserRoomAssignmentsRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async findAssignmentById(id: string): Promise<UserRoomAssignment | null> {
    const setting = await super.findById<user_preferences>('user_preferences', id);
    if (!setting) return null;
    return this.settingToUserRoomAssignment(setting);
  }

  async findAll(): Promise<UserRoomAssignment[]> {
    const settings = await this.prisma.user_preferences.findMany({
      where: {
        category: 'user_room_assignments',
      },
    });
    return settings.map((setting) => this.settingToUserRoomAssignment(setting));
  }

  async create(data: Partial<UserRoomAssignment>): Promise<UserRoomAssignment> {
    const setting = await this.prisma.user_preferences.create({
      data: {
        user_id: data.user_id!,
        category: 'user_room_assignments',
        setting_key: data.assignment_id!,
        setting_value: JSON.stringify(data),
      },
    });
    return this.settingToUserRoomAssignment(setting);
  }

  async update(id: string, data: Partial<UserRoomAssignment>): Promise<UserRoomAssignment | null> {
    try {
      const setting = await this.prisma.user_preferences.update({
        where: { id },
        data: {
          setting_value: JSON.stringify(data),
        },
      });
      return this.settingToUserRoomAssignment(setting);
    } catch {
      return null;
    }
  }

  async remove(id: string): Promise<void> {
    await this.prisma.user_preferences.delete({
      where: { id },
    });
  }

  private settingToUserRoomAssignment(setting: user_preferences): UserRoomAssignment {
    const data = JSON.parse(setting.setting_value);
    return {
      assignment_id: setting.id,
      user_id: setting.user_id,
      room_id: data.room_id,
      bed_number: data.bed_number,
      assigned_at: data.assigned_at || new Date(),
      unassigned_at: data.unassigned_at,
      is_active: data.is_active ?? true,
      assigned_by: data.assigned_by,
      assignment_notes: data.assignment_notes,
    };
  }
}
