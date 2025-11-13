import { SetMetadata } from '@nestjs/common';

// tên key để lưu metadata (giống nhãn dán)
export const ROLES_KEY = 'roles';

// các giá trị role hợp lệ
export type Role = 'customer' | 'caregiver' | 'admin';

// decorator: @Roles('admin', 'caregiver')
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
