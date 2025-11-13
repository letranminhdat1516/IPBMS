import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PatientSupplementsRepository } from '../../../infrastructure/repositories/users/patient-supplements.repository';
import { AccessControlService } from '../shared/access-control.service';

@Injectable()
export class DoctorsService {
  constructor(
    private readonly repo: PatientSupplementsRepository,
    private readonly acl: AccessControlService,
  ) {}

  private async assertReadAccess(requester: any, customer_id: string) {
    if (requester.role === 'customer' && requester.userId !== customer_id) {
      throw new ForbiddenException('You can only access your own data');
    }
    if (requester.role === 'caregiver' && requester.userId !== customer_id) {
      const ok = await this.acl.caregiverCanAccessPatient(requester.userId, customer_id);
      if (!ok) throw new ForbiddenException('Caregiver not assigned to this patient');
    }
  }

  private async assertWriteAccess(requester: any, customer_id: string) {
    // similar to supplements create/update rules
    if (requester.role === 'customer' && requester.userId !== customer_id) {
      throw new ForbiddenException('You can only modify your own data');
    }
    if (requester.role === 'caregiver' && requester.userId !== customer_id) {
      const ok = await this.acl.caregiverCanAccessPatient(requester.userId, customer_id);
      if (!ok) throw new ForbiddenException('Caregiver not assigned to this patient');
    }
  }

  async listForPatient(requester: any, customer_id: string) {
    await this.assertReadAccess(requester, customer_id);
    const s = await this.repo.findByCustomerId(customer_id);
    return (s && (s as any).doctors) || [];
  }

  async getDoctor(requester: any, customer_id: string, doctor_id: string) {
    await this.assertReadAccess(requester, customer_id);
    const s = await this.repo.findByCustomerId(customer_id);
    const doctors = (s && (s as any).doctors) || [];
    const d = doctors.find((x: any) => x.id === doctor_id);
    if (!d) throw new NotFoundException('Doctor not found');
    return d;
  }

  async createDoctor(requester: any, customer_id: string, data: any) {
    await this.assertWriteAccess(requester, customer_id);
    const s = await this.repo.findByCustomerId(customer_id);
    const doctor = { id: randomUUID(), created_at: new Date(), ...data };

    if (!s) {
      // create a new supplement record with doctors
      const create = { doctors: [doctor] } as any;
      const res = await this.repo.createForCustomer(customer_id, create);
      return doctor;
    }

    const doctors = Array.isArray((s as any).doctors) ? (s as any).doctors.slice() : [];
    doctors.push(doctor);
    await this.repo.updateBySupplementId((s as any).id, { doctors } as any);
    return doctor;
  }

  async updateDoctor(requester: any, customer_id: string, doctor_id: string, data: any) {
    await this.assertWriteAccess(requester, customer_id);
    const s = await this.repo.findByCustomerId(customer_id);
    if (!s) throw new NotFoundException('Supplement record not found');
    const doctors = Array.isArray((s as any).doctors) ? (s as any).doctors.slice() : [];
    const idx = doctors.findIndex((x: any) => x.id === doctor_id);
    if (idx === -1) throw new NotFoundException('Doctor not found');
    const updated = { ...doctors[idx], ...data, updated_at: new Date() };
    doctors[idx] = updated;
    await this.repo.updateBySupplementId((s as any).id, { doctors } as any);
    return updated;
  }

  async removeDoctor(requester: any, customer_id: string, doctor_id: string) {
    await this.assertWriteAccess(requester, customer_id);
    const s = await this.repo.findByCustomerId(customer_id);
    if (!s) throw new NotFoundException('Supplement record not found');
    const doctors = Array.isArray((s as any).doctors) ? (s as any).doctors.slice() : [];
    const filtered = doctors.filter((x: any) => x.id !== doctor_id);
    if (filtered.length === doctors.length) throw new NotFoundException('Doctor not found');
    await this.repo.updateBySupplementId((s as any).id, { doctors: filtered } as any);
    return { success: true };
  }
}
