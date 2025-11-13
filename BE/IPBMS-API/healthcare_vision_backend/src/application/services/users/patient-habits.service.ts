import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { patient_habits } from '@prisma/client';

@Injectable()
export class PatientHabitsService {
  constructor(private readonly prismaService: PrismaService) {}

  // Parse a time string 'HH:mm[:ss]' into a Date anchored at 1970-01-01 UTC
  private parseTimeToUTCDate(time?: string | null): Date | undefined | null {
    if (time === undefined) return undefined;
    if (time === null) return null;
    // Accept 'HH:mm' or 'HH:mm:ss', optionally with timezone (ignored)
    const parts = time.split(':').map((p) => p.trim());
    const hh = Number(parts[0] || 0) || 0;
    const mm = Number(parts[1] || 0) || 0;
    const ss = Number(parts[2] || 0) || 0;
    // Build a UTC Date on epoch day
    const d = new Date(Date.UTC(1970, 0, 1, hh, mm, ss));
    return d;
  }

  async getAllHabits(): Promise<patient_habits[]> {
    return await this.prismaService.patient_habits.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async getHabitsBySupplement(supplementId: string): Promise<patient_habits[]> {
    return await this.prismaService.patient_habits.findMany({
      where: { supplement_id: supplementId },
      orderBy: { created_at: 'desc' },
    });
  }

  async getHabitById(id: string): Promise<patient_habits | null> {
    try {
      return await this.prismaService.patient_habits.findUnique({
        where: { habit_id: id },
      });
    } catch {
      return null;
    }
  }

  async createHabit(data: {
    habit_type: string;
    habit_name: string;
    description?: string;
    sleep_start?: string;
    sleep_end?: string;
    frequency: string;
    days_of_week?: any;
    // location removed
    notes?: string;
    is_active?: boolean;
    supplement_id?: string;
    user_id?: string;
  }): Promise<patient_habits> {
    const payload: any = {
      habit_type: data.habit_type as any,
      habit_name: data.habit_name,
      description: data.description,
      sleep_start: data.sleep_start ? this.parseTimeToUTCDate(data.sleep_start) : undefined,
      sleep_end: data.sleep_end ? this.parseTimeToUTCDate(data.sleep_end) : undefined,
      frequency: data.frequency as any,
      days_of_week: data.days_of_week,
      // location intentionally omitted (removed)
      notes: data.notes,
      is_active: data.is_active !== undefined ? data.is_active : true,
      supplement_id: data.supplement_id,
      user_id: data.user_id,
    };

    return await this.prismaService.patient_habits.create({ data: payload as any });
  }

  async updateHabit(
    id: string,
    data: {
      habit_type?: string;
      habit_name?: string;
      description?: string;
      sleep_start?: string;
      sleep_end?: string;
      frequency?: string;
      days_of_week?: any;
      notes?: string;
      is_active?: boolean;
    },
  ): Promise<patient_habits | null> {
    const updateData: any = {};

    if (data.habit_type !== undefined) {
      updateData.habit_type = data.habit_type;
    }
    if (data.habit_name !== undefined) {
      updateData.habit_name = data.habit_name;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.sleep_start !== undefined) {
      updateData.sleep_start = data.sleep_start ? this.parseTimeToUTCDate(data.sleep_start) : null;
    }
    if (data.sleep_end !== undefined) {
      updateData.sleep_end = data.sleep_end ? this.parseTimeToUTCDate(data.sleep_end) : null;
    }
    if (data.frequency !== undefined) {
      updateData.frequency = data.frequency;
    }
    if (data.days_of_week !== undefined) {
      updateData.days_of_week = data.days_of_week;
    }
    // location field removed; nothing to do here
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at
    updateData.updated_at = new Date();

    try {
      const updated = await this.prismaService.patient_habits.update({
        where: { habit_id: id },
        data: updateData,
      });
      return updated;
    } catch {
      return null;
    }
  }

  async deleteHabit(id: string): Promise<{ deleted: boolean }> {
    try {
      await this.prismaService.patient_habits.delete({
        where: { habit_id: id },
      });
      return { deleted: true };
    } catch {
      return { deleted: false };
    }
  }

  async toggleHabitStatus(id: string): Promise<patient_habits | null> {
    try {
      // First get the current status
      const currentHabit = await this.prismaService.patient_habits.findUnique({
        where: { habit_id: id },
        select: { is_active: true },
      });

      if (!currentHabit) {
        return null;
      }

      // Then update with the opposite status
      return await this.prismaService.patient_habits.update({
        where: { habit_id: id },
        data: {
          is_active: !currentHabit.is_active,
          updated_at: new Date(),
        },
      });
    } catch {
      return null;
    }
  }
}
