import { SharedPermissions } from 'src/application/utils/shared-permissions';

export interface IUserRepository {
  findById(userId: string): Promise<any>;
  findByPhone(phoneNumber: string): Promise<any>;
  findByEmail(email: string): Promise<any>;
  create(userData: any): Promise<any>;
  update(userId: string, userData: any): Promise<any>;
}

export interface IEventRepository {
  listAll(limit?: number): Promise<any[]>;
  recentByUser(userId: string, limit?: number): Promise<any[]>;
  create(eventData: any): Promise<any>;
}

export interface ISystemSettingsRepository {
  get(key: string): Promise<any>;
  set(key: string, value: string, updatedBy?: string): Promise<any>;
  list(): Promise<any[]>;
}

export interface ISharedPermissionRepository {
  findByCustomerAndCaregiver(
    customerId: string,
    caregiverId: string,
  ): Promise<SharedPermissions | null>;
  upsert(
    customerId: string,
    caregiverId: string,
    data: SharedPermissions,
  ): Promise<SharedPermissions>;
  delete(customerId: string, caregiverId: string): Promise<void>;
  getAllByCaregiver(caregiverId: string): Promise<SharedPermissions[]>;
}
