import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { EmergencyContactsRepository } from '../../../infrastructure/repositories/users/emergency-contacts.repository';
import { emergency_contacts } from '@prisma/client';

export interface EmergencyContactData {
  id: string;
  user_id: string;
  name: string;
  relation: string;
  phone: string;
  alert_level: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateEmergencyContactDto {
  name: string;
  relation: string;
  phone: string;
  alert_level: number;
}

export interface UpdateEmergencyContactDto {
  name?: string;
  relation?: string;
  phone?: string;
  alert_level?: number;
}

@Injectable()
export class EmergencyContactsService {
  constructor(private readonly emergencyContactsRepository: EmergencyContactsRepository) {}

  /**
   * Get all emergency contacts for a user
   */
  async getEmergencyContacts(userId: string): Promise<EmergencyContactData[]> {
    const contacts = await this.emergencyContactsRepository.listByUserId(userId);
    return contacts.map((contact) => ({
      id: contact.id,
      user_id: (contact as any).user_id || userId, // Fallback for old schema
      name: contact.name,
      relation: contact.relation,
      phone: contact.phone,
      alert_level: contact.alert_level,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
    }));
  }

  /**
   * Get emergency contact by ID
   */
  async getEmergencyContactById(id: string, userId: string): Promise<EmergencyContactData> {
    const contact = await this.emergencyContactsRepository.findByIdAndUserId(id, userId);
    if (!contact) {
      throw new NotFoundException('Emergency contact not found');
    }

    return {
      id: contact.id,
      user_id: (contact as any).user_id || userId,
      name: contact.name,
      relation: contact.relation,
      phone: contact.phone,
      alert_level: contact.alert_level,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
    };
  }

  /**
   * Create new emergency contact
   */
  async createEmergencyContact(
    userId: string,
    data: CreateEmergencyContactDto,
  ): Promise<EmergencyContactData> {
    // Validate alert level
    if (data.alert_level !== 1 && data.alert_level !== 2) {
      throw new BadRequestException('Alert level must be 1 or 2');
    }

    // Validate phone number format
    const normalizedPhone = this.normalizePhoneNumber(data.phone);
    if (!normalizedPhone) {
      throw new BadRequestException(
        'Invalid phone number format. Must be +84xxxxxxxxx or 0xxxxxxxxx',
      );
    }

    const contact = await this.emergencyContactsRepository.create(userId, {
      ...data,
      phone: normalizedPhone,
    });

    return {
      id: contact.id,
      user_id: (contact as any).user_id || userId,
      name: contact.name,
      relation: contact.relation,
      phone: contact.phone,
      alert_level: contact.alert_level,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
    };
  }

  /**
   * Update emergency contact
   */
  async updateEmergencyContact(
    id: string,
    userId: string,
    data: UpdateEmergencyContactDto,
  ): Promise<EmergencyContactData> {
    // Validate alert level if provided
    if (data.alert_level !== undefined && data.alert_level !== 1 && data.alert_level !== 2) {
      throw new BadRequestException('Alert level must be 1 or 2');
    }

    // Validate and normalize phone number if provided
    if (data.phone) {
      const normalizedPhone = this.normalizePhoneNumber(data.phone);
      if (!normalizedPhone) {
        throw new BadRequestException(
          'Invalid phone number format. Must be +84xxxxxxxxx or 0xxxxxxxxx',
        );
      }
      data.phone = normalizedPhone;
    }

    const contact = await this.emergencyContactsRepository.update(id, userId, data);

    return {
      id: contact.id,
      user_id: (contact as any).user_id || userId,
      name: contact.name,
      relation: contact.relation,
      phone: contact.phone,
      alert_level: contact.alert_level,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
    };
  }

  /**
   * Delete emergency contact
   */
  async deleteEmergencyContact(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.emergencyContactsRepository.softDeleteContact(id, userId);
    return {
      success: true,
      message: 'Emergency contact deleted successfully',
    };
  }

  /**
   * Normalize Vietnamese phone number to +84 format
   */
  private normalizePhoneNumber(phone: string): string | null {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Check if it's a valid Vietnamese mobile number
    if (digits.startsWith('84') && digits.length === 11) {
      // Already in +84 format without +
      return `+84${digits.slice(2)}`;
    } else if (digits.startsWith('0') && digits.length === 10) {
      // Vietnamese format starting with 0
      return `+84${digits.slice(1)}`;
    } else if (digits.length === 9 && !digits.startsWith('0')) {
      // Just the last 9 digits
      return `+84${digits}`;
    }

    return null; // Invalid format
  }
}
