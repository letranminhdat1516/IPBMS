import { Injectable } from '@nestjs/common';
import { BasePrismaRepository } from '../shared/base-prisma.repository';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';

@Injectable()
export class AssignmentsRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async findActive(caregiver_id?: string, customer_id?: string) {
    const where: any = {
      is_active: true,
    };

    if (caregiver_id) {
      where.caregiver_id = caregiver_id;
    }

    if (customer_id) {
      where.customer_id = customer_id;
    }

    return this.prisma.caregiver_invitations.findMany({
      where,
    });
  }

  async findAcceptedOtherCustomer(caregiver_id: string, customer_id: string) {
    return this.prisma.caregiver_invitations.findFirst({
      where: {
        caregiver_id,
        customer_id: {
          not: customer_id,
        },
        status: 'accepted',
        is_active: true,
      },
    });
  }

  async assign(caregiver_id: string, customer_id: string, assigned_by?: string, notes?: string) {
    return this.prisma.caregiver_invitations.create({
      data: {
        caregiver_id,
        customer_id,
        assigned_by,
        assignment_notes: notes,
        status: 'pending',
        is_active: true,
        assigned_at: new Date(),
        // Default expiration: 7 days from creation
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  async findByAssignmentId(id: string) {
    return this.prisma.caregiver_invitations.findUnique({
      where: {
        assignment_id: id,
      },
    });
  }

  async updateStatus(id: string, status: 'accepted' | 'rejected', reason?: string) {
    const data: any = {
      status,
      // Record when the caregiver responded to the invitation
      responded_at: new Date(),
    };

    if (reason) {
      data.response_reason = reason;
    }

    return this.prisma.caregiver_invitations.update({
      where: {
        assignment_id: id,
      },
      data,
    });
  }

  async findByCaregiverAndStatus(
    caregiver_id: string,
    status: 'pending' | 'accepted' | 'rejected',
  ) {
    return this.prisma.caregiver_invitations.findMany({
      where: {
        caregiver_id,
        status,
        is_active: true,
      },
    });
  }

  async deleteById(id: string) {
    return this.prisma.caregiver_invitations.delete({
      where: {
        assignment_id: id,
      },
    });
  }

  async findCustomersOfCaregiver(caregiver_id: string, status?: string) {
    const where: any = {
      caregiver_id,
      is_active: true,
    };

    if (status) {
      where.status = status;
    }

    return this.prisma.caregiver_invitations.findMany({
      where,
    });
  }

  async findCaregiversOfCustomer(customer_id: string, status?: string) {
    const where: any = {
      customer_id,
      is_active: true,
    };

    if (status) {
      where.status = status;
    }

    return this.prisma.caregiver_invitations.findMany({
      where,
    });
  }

  async acceptedActiveForCaregiverIds(caregiverIds: string[]): Promise<string[]> {
    const acceptedAssignments = await this.prisma.caregiver_invitations.findMany({
      where: {
        caregiver_id: {
          in: caregiverIds,
        },
        status: 'accepted',
        is_active: true,
      },
      select: {
        caregiver_id: true,
      },
    });

    return acceptedAssignments.map((assignment) => assignment.caregiver_id);
  }

  /**
   * Return active assignments (caregiver -> customer) for a list of caregiver IDs.
   */
  async findActiveAssignmentsForCaregiverIds(caregiverIds: string[]) {
    if (!Array.isArray(caregiverIds) || caregiverIds.length === 0) return [];
    return this.prisma.caregiver_invitations.findMany({
      where: {
        caregiver_id: { in: caregiverIds },
        is_active: true,
        status: 'accepted',
      },
      select: {
        caregiver_id: true,
        customer_id: true,
      },
    });
  }

  async getAssignmentStats(user_id?: string) {
    const where: any = {};

    if (user_id) {
      // If user_id is provided, filter assignments related to this user
      where.OR = [{ caregiver_id: user_id }, { customer_id: user_id }];
    }

    const [total, pending, accepted, rejected, active] = await Promise.all([
      // Total assignments
      this.prisma.caregiver_invitations.count({ where }),

      // Pending assignments
      this.prisma.caregiver_invitations.count({
        where: { ...where, status: 'pending' },
      }),

      // Accepted assignments
      this.prisma.caregiver_invitations.count({
        where: { ...where, status: 'accepted' },
      }),

      // Rejected assignments
      this.prisma.caregiver_invitations.count({
        where: { ...where, status: 'rejected' },
      }),

      // Active assignments
      this.prisma.caregiver_invitations.count({
        where: { ...where, is_active: true },
      }),
    ]);

    return {
      total,
      pending,
      accepted,
      rejected,
      active,
    };
  }

  async deleteByPair(
    caregiver_id: string,
    customer_id: string,
    requester_id: string,
    requester_role: string,
  ) {
    // Find the active assignment between this pair
    const assignment = await this.prisma.caregiver_invitations.findFirst({
      where: {
        caregiver_id,
        customer_id,
        is_active: true,
      },
    });

    if (!assignment) {
      throw new Error('Không tìm thấy assignment active giữa caregiver và customer này');
    }

    // Check if requester has permission to delete
    const isOwner =
      (requester_role === 'caregiver' && assignment.caregiver_id === requester_id) ||
      (requester_role === 'customer' && assignment.customer_id === requester_id);

    if (!isOwner) {
      throw new Error('Bạn không có quyền huỷ assignment này');
    }

    // Delete the assignment
    return this.prisma.caregiver_invitations.delete({
      where: {
        assignment_id: assignment.assignment_id,
      },
    });
  }
}
