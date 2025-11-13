import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../../../infrastructure/repositories/users/users.repository';

@Injectable()
export class UserManagementService {
  constructor(private readonly _usersRepository: UsersRepository) {}

  async getAllUsers(_query: any) {
    const users = await this._usersRepository.findAll();

    // Apply pagination and filtering if needed
    // For now, return all users with masking

    return users.map((user: any) => this.maskUserData(user));
  }

  async getUserById(userId: string) {
    const user = await this._usersRepository.findByIdPublic(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.maskUserData(user);
  }

  async getUserFullDetails(userId: string) {
    const user = await this._usersRepository.findByIdPublic(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return user; // Return full details (after verification)
  }

  async getUserStatistics() {
    const users = await this._usersRepository.findAll();
    const totalUsers = users.length;
    const activeUsers = users.filter((user: any) => user.is_active).length;

    const usersByRole = users.reduce((acc: any, user: any) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    return {
      totalUsers,
      activeUsers,
      usersByRole,
      inactiveUsers: totalUsers - activeUsers,
    };
  }

  private maskUserData(user: any) {
    return {
      ...user,
      email: this.maskEmail(user.email),
      phone_number: this.maskPhoneNumber(user.phone_number),
      // Keep other fields as is
    };
  }

  private maskEmail(email: string): string {
    if (!email) return email;
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    return `${local.substring(0, 2)}***@${domain}`;
  }

  private maskPhoneNumber(phone: string): string {
    if (!phone) return phone;
    if (phone.length <= 3) return phone;
    return `***${phone.substring(phone.length - 3)}`;
  }
}
