import { Injectable, ForbiddenException } from '@nestjs/common';
import { PatientSupplementsRepository } from '../../../infrastructure/repositories/users/patient-supplements.repository';
import { AccessControlService } from '../shared/access-control.service';

@Injectable()
export class PatientSupplementsService {
  constructor(
    private readonly repo: PatientSupplementsRepository,
    private readonly acl: AccessControlService,
  ) {}

  async listForCustomer(requester: any, customer_id: string) {
    // ACL: customers see their own, caregivers must be permitted
    if (requester.role === 'customer' && requester.userId !== customer_id) {
      throw new ForbiddenException('You can only access your own supplements');
    }
    if (requester.role === 'caregiver' && requester.userId !== customer_id) {
      const ok = await this.acl.caregiverCanAccessPatient(requester.userId, customer_id);
      if (!ok) throw new ForbiddenException('Caregiver not assigned to this patient');
    }
    return this.repo.findManyByCustomerId(customer_id);
  }

  async createForCustomer(requester: any, customer_id: string, data: any) {
    if (requester.role === 'customer' && requester.userId !== customer_id) {
      throw new ForbiddenException('You can only create supplements for yourself');
    }
    if (requester.role === 'caregiver' && requester.userId !== customer_id) {
      const ok = await this.acl.caregiverCanAccessPatient(requester.userId, customer_id);
      if (!ok) throw new ForbiddenException('Caregiver not assigned to this patient');
    }
    return this.repo.createForCustomer(customer_id, data);
  }

  async getById(requester: any, customer_id: string, supplement_id: string) {
    const s = await this.repo.findBySupplementId(supplement_id);
    if (!s) return null;
    if (s.customer_id !== customer_id) throw new ForbiddenException('Not found');
    return s;
  }

  async updateById(requester: any, customer_id: string, supplement_id: string, data: any) {
    const s = await this.repo.findBySupplementId(supplement_id);
    if (!s) throw new ForbiddenException('Not found');
    if (s.customer_id !== customer_id) throw new ForbiddenException('Not found');
    if (requester.role === 'customer' && requester.userId !== customer_id) {
      throw new ForbiddenException('You can only update your own supplements');
    }
    if (requester.role === 'caregiver' && requester.userId !== customer_id) {
      const ok = await this.acl.caregiverCanAccessPatient(requester.userId, customer_id);
      if (!ok) throw new ForbiddenException('Caregiver not assigned to this patient');
    }
    return this.repo.updateBySupplementId(supplement_id, data as any);
  }

  async removeById(requester: any, customer_id: string, supplement_id: string) {
    const s = await this.repo.findBySupplementId(supplement_id);
    if (!s) throw new ForbiddenException('Not found');
    if (s.customer_id !== customer_id) throw new ForbiddenException('Not found');
    if (requester.role === 'customer' && requester.userId !== customer_id) {
      throw new ForbiddenException('You can only delete your own supplements');
    }
    if (requester.role === 'caregiver' && requester.userId !== customer_id) {
      const ok = await this.acl.caregiverCanAccessPatient(requester.userId, customer_id);
      if (!ok) throw new ForbiddenException('Caregiver not assigned to this patient');
    }
    return this.repo.removeBySupplementId(supplement_id);
  }
}
