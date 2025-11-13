import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AssignmentsRepository } from '../../../infrastructure/repositories/users/assignments.repository';
import { UsersRepository } from '../../../infrastructure/repositories/users/users.repository';
import { NotificationPreferencesService } from '../notifications/notification-preferences.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AccessControlService } from '../shared/access-control.service';

@Injectable()
export class CaregiverInvitationsService {
  private readonly logger = new Logger(CaregiverInvitationsService.name);

  constructor(
    private readonly _repo: AssignmentsRepository,
    private readonly _acl: AccessControlService,
    private readonly _usersRepo: UsersRepository,
    private readonly _notificationsService: NotificationsService,
    private readonly _notificationPrefs: NotificationPreferencesService,
  ) {}

  /**
   * Chỉ chặn 3 TH:
   * 1) Caregiver đã accepted với customer khác
   * 2) Caregiver đã accepted với chính customer này
   * 3) Caregiver đang pending với chính customer này
   * -> Nếu trước đó rejected thì vẫn được tạo mới.
   */
  async assign(caregiver_id: string, customer_id: string, assigned_by?: string, notes?: string) {
    this._acl.invalidatePair(caregiver_id, customer_id);

    const caregiver = await this._usersRepo.findUserByIdPublic(caregiver_id);
    const customer = await this._usersRepo.findUserByIdPublic(customer_id);

    if (!caregiver || caregiver.role !== 'caregiver') {
      throw new NotFoundException('Caregiver không hợp lệ');
    }
    if (!customer || customer.role !== 'customer') {
      throw new NotFoundException('Customer không hợp lệ');
    }

    const existing = await this._repo.findActive(caregiver_id, customer_id);

    // 1) Đã accepted với customer khác
    const hasAcceptedForOther = await this._repo.findAcceptedOtherCustomer(
      caregiver_id,
      customer_id,
    );
    if (hasAcceptedForOther) {
      throw new ConflictException('Caregiver đã được assign active cho customer khác');
    }

    // 2) Đã accepted chính customer này
    const hasAccepted = existing.find((a: any) => a.status === 'accepted');
    if (hasAccepted) {
      throw new ConflictException('Caregiver đã được assign và đã accept bạn rồi');
    }

    // 3) Đang pending chính customer này
    const isPending = existing.find((a: any) => a.status === 'pending');
    if (isPending) {
      throw new ConflictException('Đã gửi assignment và đang chờ xác nhận');
    }

    try {
      const created = await this._repo.assign(caregiver_id, customer_id, assigned_by, notes);

      // Send notification to caregiver if their preferences allow it
      try {
        const should = await this._notificationPrefs.shouldSendEventType(
          caregiver_id,
          'caregiver_invitation',
        );
        if (should) {
          await this._notificationsService.create({
            user_id: caregiver_id,
            business_type: 'caregiver_invitation',
            notification_type: 'push',
            message: `Bạn được mời làm caregiver cho ${customer.full_name || customer.username}`,
            delivery_data: {
              assignment_id: created.assignment_id,
            },
          });
        }
      } catch (notifErr) {
        this.logger.warn(
          `Failed to create notification for caregiver ${caregiver_id}: ${String(notifErr)}`,
        );
      }

      return created;
    } catch (e: unknown) {
      const error = e as any;
      if (
        error?.code === 'P2002' &&
        String(error?.meta?.target || '').includes('unique_active_caregiver_assignment')
      ) {
        throw new ConflictException('Đã tồn tại assignment active cho cặp caregiver/customer này');
      }
      throw e;
    }
  }

  async updateStatus(
    id: string,
    status: 'accepted' | 'rejected',
    user_id: string,
    reason?: string,
  ) {
    const assignment = await this._repo.findByAssignmentId(id);
    if (!assignment) throw new NotFoundException('Không tìm thấy assignment');
    if (assignment.caregiver_id !== user_id) {
      throw new Error('Bạn không thể xử lý assignment không thuộc về bạn');
    }
    if (assignment.status !== 'pending') {
      throw new Error('Chỉ assignment đang chờ xác nhận mới được cập nhật');
    }

    const updated = await this._repo.updateStatus(id, status, reason);

    if (status === 'accepted') {
      this._acl.invalidatePair(assignment.caregiver_id, assignment.customer_id);
    }

    // Notify customer about caregiver response (accept/reject)
    try {
      const customerId = assignment.customer_id;
      const caregiverInfo = await this._usersRepo.findUserByIdPublic(assignment.caregiver_id);
      const should = await this._notificationPrefs.shouldSendEventType(
        customerId,
        'caregiver_invitation',
      );
      if (should) {
        const msg =
          status === 'accepted'
            ? `${caregiverInfo?.full_name || caregiverInfo?.username} đã chấp nhận lời mời`
            : `${caregiverInfo?.full_name || caregiverInfo?.username} đã từ chối lời mời${
                reason ? `: ${reason}` : ''
              }`;

        await this._notificationsService.create({
          user_id: customerId,
          business_type: 'caregiver_invitation',
          notification_type: 'push',
          message: msg,
          delivery_data: {
            assignment_id: updated.assignment_id,
            status,
            response_reason: updated.response_reason,
          },
        });
      }
    } catch {
      this.logger.warn(`Failed to notify customer about assignment ${id} status change`);
    }

    return updated;
  }

  list(caregiver_id?: string, customer_id?: string) {
    return this._repo.findActive(caregiver_id, customer_id);
  }

  async listByStatus(user_id: string, status: string) {
    return this._repo.findByCaregiverAndStatus(
      user_id,
      status as 'pending' | 'accepted' | 'rejected',
    );
  }

  async unassignById(id: string, requester_id: string, requester_role: string) {
    const assignment = await this._repo.findByAssignmentId(id);
    if (!assignment) throw new NotFoundException('Không tìm thấy assignment');

    const isOwner =
      (requester_role === 'caregiver' && assignment.caregiver_id === requester_id) ||
      (requester_role === 'customer' && assignment.customer_id === requester_id);

    if (!isOwner) {
      throw new Error('Bạn không có quyền huỷ assignment này');
    }

    await this._repo.deleteById(id); // ✅ đổi từ deactivate → delete hoàn toàn
    this._acl.invalidatePair(assignment.caregiver_id, assignment.customer_id);

    // Notify the other party that assignment was removed
    try {
      const otherUser =
        requester_role === 'caregiver' ? assignment.customer_id : assignment.caregiver_id;
      const should = await this._notificationPrefs.shouldSendEventType(
        otherUser,
        'caregiver_invitation',
      );
      if (should) {
        await this._notificationsService.create({
          user_id: otherUser,
          business_type: 'caregiver_invitation',
          notification_type: 'push',
          message: `Assignment giữa caregiver ${assignment.caregiver_id} và customer ${assignment.customer_id} đã bị huỷ`,
          delivery_data: {
            assignment_id: assignment.assignment_id,
          },
        });
      }
    } catch {
      this.logger.warn(`Failed to notify other party after unassign ${id}`);
    }

    return { message: 'Đã xoá assignment thành công' };
  }

  async listCustomersOfCaregiver(caregiver_id: string, status?: string) {
    const assignments = await this._repo.findCustomersOfCaregiver(caregiver_id, status);

    // Batch fetch customer user info to avoid N+1
    const customerIds = Array.from(new Set(assignments.map((a) => a.customer_id)));
    const customers =
      customerIds.length > 0
        ? typeof this._usersRepo.findUsersByIds === 'function'
          ? await this._usersRepo.findUsersByIds(customerIds)
          : await Promise.all(customerIds.map((id) => this._usersRepo.findUserByIdPublic(id)))
        : [];
    const customersMap = new Map((customers as any[]).filter(Boolean).map((u) => [u.user_id, u]));

    const results = [];
    for (const a of assignments) {
      const assignedByInfo = a.assigned_by
        ? await this._usersRepo.findUserByIdPublic(a.assigned_by)
        : undefined;

      const customerInfo = customersMap.get(a.customer_id as string) as any | undefined;

      results.push({
        assignment_id: a.assignment_id,
        caregiver_id: a.caregiver_id,
        customer_id: a.customer_id,
        assigned_at: a.assigned_at,
        unassigned_at: a.unassigned_at,
        is_active: a.is_active,
        status: a.status,
        assignment_notes: a.assignment_notes,
        assigned_by_info: assignedByInfo
          ? {
              user_id: assignedByInfo.user_id,
              username: assignedByInfo.username,
              full_name: assignedByInfo.full_name ?? assignedByInfo.username ?? 'Unknown',
            }
          : undefined,
        customer: customerInfo
          ? {
              full_name: customerInfo.full_name ?? customerInfo.username ?? 'Unknown',
              username: customerInfo.username ?? null,
            }
          : { full_name: 'Unknown', username: null },
      });
    }

    return results;
  }

  async listCaregiversOfCustomer(customer_id: string, status?: string) {
    const assignments = await this._repo.findCaregiversOfCustomer(customer_id, status);

    // Batch fetch caregiver user info to avoid N+1
    const caregiverIds = Array.from(new Set(assignments.map((a) => a.caregiver_id)));
    const caregivers =
      caregiverIds.length > 0
        ? typeof this._usersRepo.findUsersByIds === 'function'
          ? await this._usersRepo.findUsersByIds(caregiverIds)
          : await Promise.all(caregiverIds.map((id) => this._usersRepo.findUserByIdPublic(id)))
        : [];
    const caregiversMap = new Map((caregivers as any[]).filter(Boolean).map((u) => [u.user_id, u]));

    const results = [];
    for (const a of assignments) {
      const assignedByInfo = a.assigned_by
        ? await this._usersRepo.findUserByIdPublic(a.assigned_by)
        : undefined;

      const caregiverInfo = caregiversMap.get(a.caregiver_id as string) as any | undefined;

      results.push({
        assignment_id: a.assignment_id,
        caregiver_id: a.caregiver_id,
        customer_id: a.customer_id,
        assigned_at: a.assigned_at,
        unassigned_at: a.unassigned_at,
        is_active: a.is_active,
        status: a.status,
        assignment_notes: a.assignment_notes,
        assigned_by_info: assignedByInfo
          ? {
              user_id: assignedByInfo.user_id,
              username: assignedByInfo.username,
              full_name: assignedByInfo.full_name ?? assignedByInfo.username ?? 'Unknown',
            }
          : undefined,
        caregiver: caregiverInfo
          ? {
              full_name: caregiverInfo.full_name ?? caregiverInfo.username ?? 'Unknown',
              username: caregiverInfo.username ?? null,
            }
          : { full_name: 'Unknown', username: null },
      });
    }

    return results;
  }

  async getStats(user_id?: string) {
    try {
      const stats = await this._repo.getAssignmentStats(user_id);

      return {
        success: true,
        data: {
          total_assignments: stats.total || 0,
          pending_assignments: stats.pending || 0,
          accepted_assignments: stats.accepted || 0,
          rejected_assignments: stats.rejected || 0,
          active_assignments: stats.active || 0,
        },
        message: 'Assignment stats retrieved successfully',
      };
    } catch {
      return {
        success: false,
        data: {
          total_assignments: 0,
          pending_assignments: 0,
          accepted_assignments: 0,
          rejected_assignments: 0,
          active_assignments: 0,
        },
        message: 'Failed to retrieve assignment stats',
      };
    }
  }

  async unassignByPair(
    caregiver_id: string,
    customer_id: string,
    requester_id: string,
    requester_role: string,
  ) {
    await this._repo.deleteByPair(caregiver_id, customer_id, requester_id, requester_role);

    this._acl.invalidatePair(caregiver_id, customer_id);

    return { message: 'Đã xoá assignment thành công' };
  }
}
