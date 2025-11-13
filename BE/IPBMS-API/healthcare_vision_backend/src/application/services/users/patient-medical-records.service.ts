import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { patient_medical_histories } from '@prisma/client';

@Injectable()
export class PatientMedicalRecordsService {
  constructor(private readonly _prismaService: PrismaService) {}

  async getAllRecords(): Promise<patient_medical_histories[]> {
    return await this._prismaService.patient_medical_histories.findMany({
      orderBy: { updated_at: 'desc' },
    });
  }

  async getRecordsBySupplement(supplementId: string): Promise<patient_medical_histories[]> {
    return await this._prismaService.patient_medical_histories.findMany({
      where: { supplement_id: supplementId },
      orderBy: { updated_at: 'desc' },
    });
  }

  async getRecordById(id: string): Promise<patient_medical_histories | null> {
    try {
      return await this._prismaService.patient_medical_histories.findUnique({
        where: { id },
      });
    } catch {
      return null;
    }
  }

  async createRecord(data: {
    name?: string | null;
    notes?: string | null;
    history?: any;
    supplement_id?: string;
  }): Promise<patient_medical_histories> {
    return await this._prismaService.patient_medical_histories.create({
      data: {
        name: data.name ?? null,
        notes: data.notes ?? null,
        history: data.history || [],
        supplement_id: data.supplement_id,
      },
    });
  }

  async updateRecord(
    id: string,
    data: {
      name?: string | null;
      notes?: string | null;
      history?: any;
    },
  ): Promise<patient_medical_histories | null> {
    const updateData: any = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.history !== undefined) {
      updateData.history = data.history;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at
    updateData.updated_at = new Date();

    try {
      const updated = await this._prismaService.patient_medical_histories.update({
        where: { id },
        data: updateData,
      });
      return updated;
    } catch {
      return null;
    }
  }

  async deleteRecord(id: string): Promise<{ deleted: boolean }> {
    try {
      await this._prismaService.patient_medical_histories.delete({
        where: { id },
      });
      return { deleted: true };
    } catch {
      return { deleted: false };
    }
  }

  async addCondition(id: string, condition: any): Promise<patient_medical_histories | null> {
    // For backward compatibility keep a method to set name/notes from a condition object
    try {
      const update: any = {};
      if (condition?.name !== undefined) update.name = condition.name;
      if (condition?.notes !== undefined) update.notes = condition.notes;
      if (Object.keys(update).length === 0) return null;
      update.updated_at = new Date();
      return await this._prismaService.patient_medical_histories.update({
        where: { id },
        data: update,
      });
    } catch {
      return null;
    }
  }

  async removeCondition(
    id: string,
    _conditionIndex: number,
  ): Promise<patient_medical_histories | null> {
    // Removing a condition is now equivalent to clearing name/notes on the medical record
    try {
      return await this._prismaService.patient_medical_histories.update({
        where: { id },
        data: { name: null, notes: null, updated_at: new Date() },
      });
    } catch {
      return null;
    }
  }

  async addMedication(_id: string, _medication: any): Promise<patient_medical_histories | null> {
    // medications removed; use dedicated careplan or separate resource if needed
    return null;
  }

  async removeMedication(
    _id: string,
    _medicationIndex: number,
  ): Promise<patient_medical_histories | null> {
    // medications removed; not supported
    return null;
  }
}
