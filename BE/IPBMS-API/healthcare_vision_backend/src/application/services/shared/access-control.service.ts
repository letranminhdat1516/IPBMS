import { Injectable } from '@nestjs/common';
import { AccessControlRepository } from '../../../infrastructure/repositories/shared/access-control.repository';

@Injectable()
export class AccessControlService {
  constructor(private readonly repo: AccessControlRepository) {}

  private cache = new Map<string, { value: any; exp: number }>();
  private ttlMs = Number(process.env.ACL_CACHE_TTL_MS || 30_000);

  invalidatePair(caregiverId: string, customerId: string) {
    this.cache.delete(`${caregiverId}:${customerId}`);
    // also remove cached shared permissions for this pair
    this.cache.delete(`perms:${caregiverId}:${customerId}`);
  }

  async isCaregiverAssignedToPatient(caregiverId: string, patientId: string) {
    const key = `${caregiverId}:${patientId}`;
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.exp > now) return Promise.resolve(cached.value);

    const isAssigned = await this.repo.isCaregiverAssignedToPatient(caregiverId, patientId);
    this.cache.set(key, { value: isAssigned, exp: now + this.ttlMs });
    return isAssigned;
  }

  caregiverCanAccessPatient(caregiverId: string, patientId: string) {
    const key = `${caregiverId}:${patientId}`;
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.exp > now) return Promise.resolve(cached.value);
    return (async () => {
      // Prefer explicit assignment table if present
      const explicit = await this.repo.isCaregiverExplicitlyAssigned(caregiverId, patientId);
      if (explicit) {
        this.cache.set(key, { value: true, exp: now + this.ttlMs });
        return true;
      }
      const byRoom = await this.repo.isCaregiverAssignedToPatientByRoom(caregiverId, patientId);
      this.cache.set(key, { value: byRoom, exp: now + this.ttlMs });
      return byRoom;
    })();
  }

  async canAccessSnapshot(requester: { id: string; role: string }, snapshotId: string) {
    const ownerId = await this.repo.getSnapshotOwnerUserId(snapshotId);
    if (!ownerId) return false; // không xác định được chủ sở hữu thì từ chối
    if (requester.role === 'admin') return true;
    if (requester.role === 'customer') return requester.id === ownerId;
    if (requester.role === 'caregiver') {
      if (requester.id === ownerId) return true; // đề phòng caregiver chụp cho chính họ
      return this.caregiverCanAccessPatient(requester.id, ownerId);
    }
    return false;
  }

  caregiverCanAccessRoom(caregiverId: string, roomId: string) {
    const key = `room:${caregiverId}:${roomId}`;
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.exp > now) return Promise.resolve(cached.value);
    return (async () => {
      const ok = await this.repo.isCaregiverAssignedToRoom(caregiverId, roomId);
      this.cache.set(key, { value: ok, exp: now + this.ttlMs });
      return ok;
    })();
  }

  /**
   * Return access_grants object for caregiver/customer pair or null.
   */
  async getSharedPermissions(
    caregiverId: string,
    customerId: string,
  ): Promise<Record<string, any> | null> {
    // first ensure pair is assigned
    const assigned = await this.caregiverCanAccessPatient(caregiverId, customerId);
    if (!assigned) return null;

    const key = `perms:${caregiverId}:${customerId}`;
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.exp > now) return Promise.resolve(cached.value as any);

    const perms = await this.repo.getSharedPermissionsForPair(caregiverId, customerId);
    // cache the permissions object
    this.cache.set(key, { value: perms, exp: now + this.ttlMs });
    return perms;
  }

  /**
   * Check whether caregiver has a particular permission for a given customer.
   */
  async hasPermission(caregiverId: string, customerId: string, key?: string): Promise<boolean> {
    // If no specific key requested, fallback to simple assigned check
    if (!key) {
      const assigned = await this.caregiverCanAccessPatient(caregiverId, customerId);
      return !!assigned;
    }

    // Check shared permissions object for the pair
    const perms = await this.getSharedPermissions(caregiverId, customerId);
    if (!perms) return false;

    // Normalize common colon keys to underscore (e.g. 'alert:read' -> 'alert_read')
    const normalized = key.replace(/:/g, '_');
    let val = perms[normalized];
    if (val === undefined) val = perms[key];
    if (val == null) return false;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val > 0;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'string') return val === 'true' || val === '1' || val.length > 0;
    return Boolean(val);
  }

  /**
   * General access check method for requester to access target user's data
   */
  async checkAccess(requesterId: string, targetUserId: string, role: string): Promise<boolean> {
    if (role === 'admin') return true;
    if (role === 'customer') return requesterId === targetUserId;
    if (role === 'caregiver') {
      return this.caregiverCanAccessPatient(requesterId, targetUserId);
    }
    return false;
  }
}
