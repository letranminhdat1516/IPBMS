import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SharedPermissionsRepository } from '../../../infrastructure/repositories/permissions/shared-permissions.repository';
import {
  CreatePermissionRequestDto,
  ApprovePermissionRequestDto,
  RejectPermissionRequestDto,
  BulkDecisionDto,
  PermissionRequestType,
  PermissionRequestStatus,
} from '../../dto/shared-permissions/permission-request.dto';
import { v4 as uuid } from 'uuid';

@Injectable()
export class PermissionRequestsService {
  constructor(private readonly _repo: SharedPermissionsRepository) {}

  private getActorId(user: any) {
    // ép string cho chắc, tránh so sánh 'uuid' !== UUID
    return String(user?.userId ?? user?.sub ?? user?.id ?? user?.user_id ?? '');
  }

  private ensureOwner(user: any, customerId: string) {
    const actorId = this.getActorId(user);
    if (user?.role === 'customer' && actorId !== customerId) {
      throw new ForbiddenException('Bạn không có quyền truy cập vào dữ liệu này');
    }
  }

  private nowISO() {
    return new Date().toISOString();
  }

  async create(dto: CreatePermissionRequestDto, actor?: any) {
    const current = await this._repo.findByCustomerAndCaregiver(dto.customerId, dto.caregiverId);

    if (current) {
      const alreadyGranted =
        (dto.type === 'stream_view' && current.stream_view === true) ||
        (dto.type === 'alert_read' && current.alert_read === true) ||
        (dto.type === 'alert_ack' && current.alert_ack === true) ||
        (dto.type === 'profile_view' && current.profile_view === true) ||
        (dto.type === 'log_access_days' && current.log_access_days >= (dto.requested_days ?? 0)) ||
        (dto.type === 'report_access_days' &&
          current.report_access_days >= (dto.requested_days ?? 0));

      if (alreadyGranted) {
        // ✅ Trả về 200 nhưng không tạo request mới
        return { status: 'ALREADY_GRANTED', message: 'Quyền này đã được cấp trước đó.' };
      }
    }

    const row =
      (await this._repo.findByCustomerAndCaregiver(dto.customerId, dto.caregiverId)) ||
      (await this._repo.createEmpty(dto.customerId, dto.caregiverId));

    const requests = Array.isArray(row.permission_requests) ? row.permission_requests : [];

    const hasPending = requests.some(
      (r: any) => r.type === dto.type && r.status === PermissionRequestStatus.PENDING,
    );
    if (hasPending) throw new BadRequestException('Đã gửi đơn duyệt đó rồi, chờ phản hồi nhé!');

    let value: any = true;
    switch (dto.type) {
      case 'stream_view':
      case 'alert_read':
      case 'alert_ack':
      case 'profile_view':
        value = dto.requested_bool ?? true;
        break;

      case 'log_access_days':
      case 'report_access_days':
        value = dto.requested_days ?? 0;
        break;

      case 'notification_channel': {
        value = dto.requested_channels ?? [];
        const now = this.nowISO();
        const item = {
          id: uuid(),
          type: dto.type,
          value,
          scope: dto.scope ?? null,
          status: PermissionRequestStatus.PENDING,
          reason: dto.reason ?? null,
          createdAt: now,
          decidedAt: null,
          decidedBy: null,
          decisionReason: null,
          history: [
            // 👈 thêm lịch sử khởi tạo
            {
              status: PermissionRequestStatus.PENDING,
              at: now,
              by: this.getActorId(actor),
              reason: dto.reason ?? null,
            },
          ],
        };

        requests.push(item);
        await this._repo.updateJson(dto.customerId, dto.caregiverId, {
          permission_requests: requests,
        });
        return item;
      }

      default:
        break;
    }

    const item = {
      id: uuid(),
      type: dto.type,
      value,
      scope: dto.scope ?? null,
      status: PermissionRequestStatus.PENDING,
      reason: dto.reason ?? null,
      createdAt: new Date().toISOString(),
      decidedAt: null,
      decidedBy: null,
    };

    requests.push(item);
    await this._repo.updateJson(dto.customerId, dto.caregiverId, { permission_requests: requests });

    return item;
  }

  async listByCustomer(customerId: string, status?: string) {
    const rows = await this._repo.findByCustomer(customerId);
    const out: any[] = [];
    for (const r of rows) {
      const reqs = (r.permission_requests || []).filter((x: any) => !status || x.status === status);
      for (const x of reqs) out.push({ ...x, caregiver_id: r.caregiver_id });
    }
    return out;
  }

  private applyEffectiveField(row: any, type: PermissionRequestType, value: any) {
    switch (type) {
      case PermissionRequestType.STREAM_VIEW:
        row.stream_view = !!value;
        break;
      case PermissionRequestType.ALERT_READ:
        row.alert_read = !!value;
        break;
      case PermissionRequestType.ALERT_ACK:
        row.alert_ack = !!value;
        break;
      case PermissionRequestType.PROFILE_VIEW:
        row.profile_view = !!value;
        break;
      case PermissionRequestType.LOG_ACCESS_DAYS:
        row.log_access_days = Number(value || 0);
        break;
      case PermissionRequestType.REPORT_ACCESS_DAYS:
        row.report_access_days = Number(value || 0);
        break;
      case PermissionRequestType.NOTIFICATION_CHANNEL:
        row.notification_channel = Array.isArray(value) ? value : [];
        break;
    }
    return row;
  }

  async approve(id: string, body: ApprovePermissionRequestDto, actor?: any) {
    const actorId = this.getActorId(actor);
    const host = await this._repo.findByRequestIdForCustomer(id, actorId);
    if (!host) throw new NotFoundException('Request not found');

    const reqs = (host.permission_requests as any[]) ?? [];
    const item = reqs.find((x: any) => String(x?.id) === String(id));
    if (!item || item.status !== PermissionRequestStatus.PENDING)
      throw new NotFoundException('Request not found');

    const now = this.nowISO();
    item.status = PermissionRequestStatus.APPROVED;
    item.decidedAt = now;
    item.decidedBy = actorId;
    item.decisionReason = body.decisionReason ?? null;
    (item.history ||= []).push({
      status: PermissionRequestStatus.APPROVED,
      at: now,
      by: actorId,
      reason: body.decisionReason ?? null,
    }); // 👈

    const updated = this.applyEffectiveField(host, item.type, item.value);
    await this._repo.updateById(host.id, { ...updated, permission_requests: reqs });
    return item;
  }

  async reject(id: string, body: RejectPermissionRequestDto, actor?: any) {
    const actorId = this.getActorId(actor);
    const host =
      (await this._repo.findByRequestIdForCustomer(id, actorId)) ??
      (await this._repo.findByRequestId(id));
    if (!host || host.customer_id !== actorId) throw new NotFoundException('Request not found');

    const reqs = (host.permission_requests as any[]) ?? [];
    const item = reqs.find((x: any) => x.id === id);
    if (!item) throw new NotFoundException('Request not found');

    const now = this.nowISO();
    item.status = PermissionRequestStatus.REJECTED;
    item.decidedAt = now;
    item.decidedBy = actorId;
    item.decisionReason = body.decisionReason ?? null;
    (item.history ||= []).push({
      status: PermissionRequestStatus.REJECTED,
      at: now,
      by: actorId,
      reason: body.decisionReason ?? null,
    }); // 👈

    await this._repo.updateById(host.id, { permission_requests: reqs });
    return item;
  }

  async bulkApprove(body: BulkDecisionDto, actor?: any) {
    const actorId = this.getActorId(actor);
    const ids = body.ids ?? [];

    // Prefetch: chỉ nhận những request đang PENDING thuộc customer này
    const pending = await this.listByCustomer(actorId, 'PENDING');
    const validIdSet = new Set(pending.map((x) => x.id));

    const results: Array<{
      id: string;
      status: 'APPROVED' | 'SKIPPED' | 'ERROR';
      reason?: string;
    }> = [];

    for (const id of ids) {
      if (!validIdSet.has(id)) {
        results.push({ id, status: 'SKIPPED', reason: 'NOT_FOUND_OR_NOT_OWNED_OR_NOT_PENDING' });
        continue;
      }
      try {
        await this.approve(
          id,
          { decisionReason: body.decisionReason, override: body.override },
          actor,
        );
        results.push({ id, status: 'APPROVED' });
      } catch (e: any) {
        results.push({ id, status: 'ERROR', reason: e?.message ?? 'UNKNOWN' });
      }
    }

    const updated = results.filter((x) => x.status === 'APPROVED').length;
    return { updated, results };
  }

  async bulkReject(body: BulkDecisionDto, actor?: any) {
    const results: Array<any> = [];
    let updated = 0;
    for (const id of body.ids) {
      try {
        const r = await this.reject(id, body, actor);
        results.push({ id, success: true, result: r });
        updated += 1;
      } catch (err: any) {
        results.push({ id, success: false, error: err?.message ?? String(err) });
      }
    }
    return { updated, results };
  }
  async listAllByCustomer(customerId: string) {
    const rows = await this._repo.findByCustomer(customerId);
    const out: any[] = [];
    for (const r of rows) {
      const reqs = r.permission_requests || [];
      for (const x of reqs) out.push({ ...x, caregiver_id: r.caregiver_id });
    }
    return out;
  }

  async listDecidedByCustomer(customerId: string) {
    const rows = await this._repo.findByCustomer(customerId);
    const out: any[] = [];
    for (const r of rows) {
      const reqs = (r.permission_requests || []).filter((x: any) =>
        [
          PermissionRequestStatus.APPROVED,
          PermissionRequestStatus.REJECTED,
          PermissionRequestStatus.REVOKED,
        ].includes(x.status),
      );
      for (const x of reqs) out.push({ ...x, caregiver_id: r.caregiver_id });
    }
    return out;
  }
  async getOneWithHistory(id: string, actor: any) {
    const actorId = this.getActorId(actor);
    const isCustomer = actor?.role === 'customer';
    const isCaregiver = actor?.role === 'caregiver';

    // tìm host theo role để đúng tenant
    let host: any = null;
    if (isCustomer) {
      host = await this._repo.findByRequestIdForCustomer(id, actorId);
    } else if (isCaregiver) {
      host = await this._repo.findByRequestIdForCaregiver(id, actorId); // 👈 mới thêm
    } else {
      // admin (hoặc role khác) thì tra toàn bảng
      host = await this._repo.findByRequestId(id);
    }
    if (!host) throw new NotFoundException('Request not found');

    // enforce quyền an toàn (phòng khi gọi nhầm)
    if (isCustomer && String(host.customer_id) !== String(actorId)) {
      throw new ForbiddenException('Bạn không có quyền truy cập yêu cầu này');
    }
    if (isCaregiver && String(host.caregiver_id) !== String(actorId)) {
      throw new ForbiddenException('Bạn không có quyền truy cập yêu cầu này');
    }

    // guard kiểu JSONB -> array trước khi find
    const reqs: any[] = Array.isArray(host.permission_requests)
      ? (host.permission_requests as any[])
      : [];
    const item = reqs.find((x) => String(x?.id) === String(id));
    if (!item) throw new NotFoundException('Request not found');

    // chuẩn hoá history (tuỳ chọn)
    const histArr: any[] = Array.isArray(item.history) ? [...item.history] : [];
    const createdAt = item.createdAt ?? new Date(0).toISOString();
    if (!histArr.some((h) => h?.status === 'PENDING')) {
      histArr.unshift({
        status: 'PENDING',
        at: createdAt,
        by: item.createdBy ?? null,
        reason: item.reason ?? null,
      });
    }
    if (item.decidedAt && !histArr.some((h) => h?.at === item.decidedAt)) {
      histArr.push({
        status: item.status,
        at: item.decidedAt,
        by: item.decidedBy ?? null,
        reason: item.decisionReason ?? null,
      });
    }
    histArr.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    return {
      ...item,
      history: histArr,
      caregiver_id: host.caregiver_id,
      customer_id: host.customer_id,
    };
  }

  async reopen(id: string, actor: any, reason?: string) {
    const actorId = this.getActorId(actor);
    const host =
      (await this._repo.findByRequestIdForCustomer(id, actorId)) ??
      (await this._repo.findByRequestId(id));
    if (!host || host.customer_id !== actorId) throw new NotFoundException('Request not found');

    const reqs = (host.permission_requests as any[]) ?? [];
    const item = reqs.find((x: any) => x.id === id);
    if (!item) throw new NotFoundException('Request not found');

    // Cho phép reopen từ REJECTED/REVOKED (tuỳ policy)
    if (
      ![PermissionRequestStatus.REJECTED, PermissionRequestStatus.REVOKED].includes(item.status)
    ) {
      throw new BadRequestException('Only REJECTED/REVOKED requests can be reopened');
    }

    const now = this.nowISO();
    item.status = PermissionRequestStatus.PENDING;
    item.decidedAt = null;
    item.decidedBy = null;
    item.decisionReason = null;
    (item.history ||= []).push({
      status: PermissionRequestStatus.PENDING,
      at: now,
      by: actorId,
      reason: reason ?? null,
    });

    await this._repo.updateById(host.id, { permission_requests: reqs });
    return item;
  }
}
