import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from '../../../application/dto/user/create-user.dto';
import { User } from '../../../core/entities/users.entity';
import { PaginateOptions } from '../../../core/types/paginate.types';
import { Quota } from '../../../infrastructure/repositories/admin/quota.repository';
import { EventsRepository } from '../../../infrastructure/repositories/events/events.repository';
import { FcmTokenRepository } from '../../../infrastructure/repositories/notifications/fcm-token.repository';
import { SubscriptionRepository } from '../../../infrastructure/repositories/payments/subscription.repository';
import { ActivityLogsRepository } from '../../../infrastructure/repositories/shared/activity-logs.repository';
import { SystemConfigRepository } from '../../../infrastructure/repositories/system/system-config.repository';
import { CustomersRepository } from '../../../infrastructure/repositories/users/customers.repository';
import { AssignmentsRepository } from '../../../infrastructure/repositories/users/assignments.repository';
import { CamerasRepository } from '../../../infrastructure/repositories/devices/cameras.repository';
import { UsersRepository } from '../../../infrastructure/repositories/users/users.repository';
import { NotificationService } from '../../../shared/services/notification.service';
import { sanitizeOrder } from '../../../shared/utils/order.util';
import { QuotaService } from '../admin/quota.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  // In-memory cache for user summaries to reduce DB load for frequent calls
  // Map key: user_id, value: { data: UserSummary, expiresAt: number }
  private _summariesCache: Map<string, { data: UserSummary; expiresAt: number }> = new Map();
  private readonly _summariesCacheTtlMs: number = Number(
    process.env.USERS_SUMMARIES_CACHE_TTL_MS ?? '30000',
  ); // 30s default
  constructor(
    private readonly _usersRepo: UsersRepository,
    private readonly _activityLogsRepo: ActivityLogsRepository,
    private readonly _fcmTokenRepo: FcmTokenRepository,
    private readonly _systemSettingsRepo: SystemConfigRepository,
    private readonly _eventsRepo: EventsRepository,
    private readonly _subscriptionRepo: SubscriptionRepository,
    private readonly _customersRepo: CustomersRepository,
    private readonly _camerasRepo: CamerasRepository,
    private readonly _assignmentsRepo: AssignmentsRepository,
    private readonly _quotaService: QuotaService,
    private readonly _subscriptionService: SubscriptionService,
    private readonly _notificationService: NotificationService,
  ) {}

  /**
   * Tạo các cài đặt mặc định cho customer mới
   * - image_settings: Cài đặt camera và lưu trữ
   * - alert_settings: Cài đặt thông báo
   * @param userId ID của user
   * @param updatedBy ID của người cập nhật (thường là chính user đó)
   */

  private static readonly ORDERABLE_FIELDS = [
    'created_at',
    'updated_at',
    'full_name',
    'email',
    'username',
  ] as const;

  private getSafeOrder(
    order: Record<string, 'ASC' | 'DESC'> | undefined,
    defaultOrder: Record<string, 'ASC' | 'DESC'>,
  ) {
    const safe = sanitizeOrder(
      order,
      UsersService.ORDERABLE_FIELDS as unknown as string[],
      defaultOrder,
    );

    return Object.fromEntries(
      Object.entries(safe).map(([k, v]) => [k, v.toLowerCase() as 'asc' | 'desc']),
    );
  }

  // ====== READ ======
  async findById(user_id: string): Promise<User> {
    const user = await this._usersRepo.findUserById(user_id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  findAll(): Promise<User[]> {
    return this._usersRepo.findAllUsers();
  }

  async findManyByIds(ids: string[]): Promise<User[]> {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    return this._usersRepo.findUsersByIds(ids);
  }

  findByPhone(phone_number: string): Promise<User | null> {
    return this._usersRepo.findByPhone(phone_number);
  }

  findByEmail(email: string): Promise<User | null> {
    return this._usersRepo.findByEmail(email);
  }

  // ====== SEARCH / PAGINATION ======
  search(keyword: string): Promise<User[]> {
    return this._usersRepo.search(keyword ?? '');
  }

  paginateWithWhere(
    where: any,
    page = 1,
    limit = 20,
    order: Record<string, 'ASC' | 'DESC'> = { created_at: 'DESC' },
  ) {
    const safeOrder = this.getSafeOrder(order, { created_at: 'DESC' });
    return this._usersRepo.paginateUsersWithWhere(where, page, limit, safeOrder);
  }

  paginateWithSearch(
    keyword: string,
    page = 1,
    limit = 20,
    order: Record<string, 'ASC' | 'DESC'> = { created_at: 'DESC' },
  ) {
    const safeOrder = this.getSafeOrder(order, { created_at: 'DESC' });
    return this._usersRepo.paginateWithSearch(keyword ?? '', page, limit, safeOrder);
  }

  findAllWithOptions(
    where: any = {},
    order: Record<string, 'ASC' | 'DESC'> = { created_at: 'DESC' },
  ) {
    const safeOrder = this.getSafeOrder(order, { created_at: 'DESC' });
    return this._usersRepo.findAllUsersWithOptions(where, safeOrder);
  }

  paginateDynamic(options: PaginateOptions) {
    const safeOrder = this.getSafeOrder(options.order as any, {
      created_at: 'DESC',
    });
    return this._usersRepo.paginateUsersDynamic({ ...options, order: safeOrder });
  }

  // ====== WRITE ======
  /**
   * Tạo user mới với validation và setup mặc định
   * - Validate email, phone, full_name
   * - Hash password
   * - Tạo free subscription cho customer
   * - Setup customer defaults (image_settings, alert_settings)
   */
  async create(data: CreateUserDto): Promise<User> {
    // Validate email
    if (data.email) {
      const existed = await this._usersRepo.findByEmail(data.email);
      if (existed) throw new BadRequestException('Email already exists');
    }

    // Validate phone
    if (data.phone_number) {
      const existedPhone = await this._usersRepo.findByPhone(data.phone_number);
      if (existedPhone) throw new BadRequestException('Phone number already exists');
    }

    // Validate full_name
    if (!data.full_name || typeof data.full_name !== 'string' || !data.full_name.trim()) {
      throw new BadRequestException('full_name is required');
    }

    // Validate username
    if (data.username) {
      const existedUsername = await this._usersRepo.findAllUsersWithOptions({
        username: data.username,
      });
      if (existedUsername.length > 0) {
        throw new BadRequestException('Username already exists');
      }
    }

    // Hard password (OTP login only)
    const hardPassword = `otp_only_${Date.now()}`;
    const password_hash = await bcrypt.hash(hardPassword, 10);

    const user = await this._usersRepo.createUser({
      ...data,
      username: data.username || `user_${Date.now()}`,
      password_hash,
    });

    if (user.role === 'customer') {
      await this._subscriptionService.createFree(user.user_id);
    }

    return user;
  }

  async update(user_id: string, data: Partial<User> & { password?: string }): Promise<User> {
    // Check email
    if (data.email) {
      const existed = await this._usersRepo.findByEmail(data.email);
      if (existed && existed.user_id !== user_id) {
        throw new BadRequestException('Email already exists');
      }
    }

    // Check phone
    if (data.phone_number) {
      const existed = await this._usersRepo.findByPhone(data.phone_number);
      if (existed && existed.user_id !== user_id) {
        throw new BadRequestException('Phone number already exists');
      }
    }

    // ✅ Check username
    if (data.username) {
      const existed = await this._usersRepo.findAllUsersWithOptions({ username: data.username });
      if (existed.length > 0 && existed[0].user_id !== user_id) {
        throw new BadRequestException('Username already exists');
      }
    }

    const current = await this._usersRepo.findUserById(user_id);
    if (!current) throw new NotFoundException('User not found');

    let updateData = { ...data };

    if (data.password) {
      updateData.password_hash = await bcrypt.hash(data.password, 10);
      delete updateData.password;
    }

    if (data.date_of_birth) {
      updateData.date_of_birth = new Date(data.date_of_birth as any).toISOString();
    }

    const updated = await this._usersRepo.updateUser(user_id, updateData);
    return updated!;
  }

  async remove(user_id: string) {
    // Có thể bỏ qua check tồn tại nếu muốn hiệu năng
    const existed = await this._usersRepo.findUserById(user_id);
    if (!existed) throw new NotFoundException('User not found');

    return this._usersRepo.removeUser(user_id); // { deleted: boolean }
  }

  async softDelete(user_id: string) {
    const existed = await this._usersRepo.findUserById(user_id);
    if (!existed) throw new NotFoundException('User not found');

    return this._usersRepo.softDeleteUser(user_id); // { deleted: boolean }
  }

  // ====== QUOTA & PLAN (SaaS logic) ======
  /**
   * Lấy quota cho user (dùng QuotaService, không còn override)
   */
  async getQuota(user_id: string): Promise<Quota> {
    return this._quotaService.getEffectiveQuota(user_id);
  }

  /**
   * Lấy thông tin plan hiện tại cho user
   * Ưu tiên subscription active/trialing mới nhất
   * Nếu không có subscription hợp lệ, tự động tạo free subscription
   * @param user_id ID của user
   * @returns Thông tin plan và subscription
   */
  async getPlan(user_id: string) {
    // Bước 1: Query subscription active/trialing mới nhất
    let sub = await this._subscriptionRepo.findAll({
      where: {
        user_id: user_id,
        status: { in: ['active', 'trialing'] },
        OR: [{ current_period_end: null }, { current_period_end: { gt: new Date() } }],
        trial_end_at: null,
      },
      include: {
        plans: {
          select: {
            name: true,
            code: true,
            camera_quota: true,
            retention_days: true,
            caregiver_seats: true,
            sites: true,
            storage_size: true,
          },
        },
      },
      orderBy: { started_at: 'desc' },
      take: 1,
    });

    // Bước 2: Nếu không có subscription hợp lệ, tạo free subscription
    if (!sub || !sub[0]) {
      // Ensure a free subscription exists
      const freeSub = await this._subscriptionService.createFree(user_id);
      // Fetch the subscription with plans included
      const subscriptionWithPlans = await this._subscriptionRepo.findBySubscriptionId(
        freeSub.subscription_id,
        { plans: true },
      );
      sub = subscriptionWithPlans ? [subscriptionWithPlans] : [freeSub as any];
    }

    // Bước 3: Trả về thông tin plan
    const subscription = sub[0];
    return {
      subscription: {
        ...subscription,
        plan_name: (subscription as any).plans?.name,
        plan_code: (subscription as any).plans?.code,
        camera_quota: (subscription as any).plans?.camera_quota,
        retention_days: (subscription as any).plans?.retention_days,
        caregiver_seats: (subscription as any).plans?.caregiver_seats,
        sites: (subscription as any).plans?.sites,
        storage_size: (subscription as any).plans?.storage_size,
      },
      plan_code: (subscription as any).plans?.code,
      plan_name: (subscription as any).plans?.name,
      source: 'subscription',
    };
  }
  /**
   * Lấy thông tin tổng hợp cho nhiều users cùng lúc
   * Sử dụng CTE để tối ưu performance với 1 query duy nhất
   * @param userIds Danh sách user IDs cần lấy thông tin
   * @returns Object map với key là user_id, value là UserSummary
   */
  async getSummaries(userIds: string[]): Promise<Record<string, UserSummary>> {
    // Validate input
    if (!Array.isArray(userIds) || userIds.length === 0) return {} as Record<string, UserSummary>;

    // Loại bỏ duplicate và giới hạn số lượng để tránh quá tải DB
    const ids = [...new Set(userIds)].slice(0, 1000); // hard cap tại 1000 users

    // Check cache per-user to avoid querying DB for recently requested summaries
    const nowTs = Date.now();
    const cachedResults: Record<string, UserSummary> = {};
    const idsToFetch: string[] = [];
    for (const id of ids) {
      const entry = this._summariesCache.get(id);
      if (entry && entry.expiresAt > nowTs) {
        cachedResults[id] = entry.data;
      } else {
        idsToFetch.push(id);
      }
    }

    // If everything was cached, return early
    if (idsToFetch.length === 0) {
      return cachedResults as Record<string, UserSummary>;
    }

    // Use Prisma for complex queries - simplified approach
    let rows: any[] = [];
    try {
      // For now, use a simpler approach with individual queries
      // This can be optimized later with raw SQL if needed
      // Bulk queries to avoid N+1 behavior
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

      const [eventsMap, subscriptionsList, camerasTotalMap, camerasActiveMap, assignments] =
        await Promise.all([
          this._eventsRepo.countEventDetectionsGroupedByUserIds(idsToFetch, todayStart),
          this._subscriptionRepo.findAll({
            where: { user_id: { in: idsToFetch } },
            include: { plans: true },
            orderBy: { started_at: 'desc' },
          }),
          this._camerasRepo.countByUserIds(idsToFetch),
          this._camerasRepo.countActiveByUserIds(idsToFetch),
          this._assignmentsRepo.findActiveAssignmentsForCaregiverIds(idsToFetch),
        ] as any);

      // Build subscription map: pick latest (ordered by started_at desc)
      const subscriptionMap: Record<string, any> = {};
      for (const s of subscriptionsList ?? []) {
        if (!s || !s.user_id) continue;
        if (!subscriptionMap[s.user_id]) subscriptionMap[s.user_id] = s;
      }

      // Build caregiver -> customerIds map from assignments
      const caregiverToCustomers: Record<string, string[]> = {};
      for (const a of assignments ?? []) {
        if (!a || !a.caregiver_id) continue;
        caregiverToCustomers[a.caregiver_id] = caregiverToCustomers[a.caregiver_id] || [];
        caregiverToCustomers[a.caregiver_id].push(a.customer_id);
      }

      // Generate rows array from ids
      const userSummaries = idsToFetch.map((userId) => {
        const sub = subscriptionMap[userId];
        const ownTotal = Number(camerasTotalMap[userId] ?? 0);
        const ownActive = Number(camerasActiveMap[userId] ?? 0);

        // If caregiver, include customers' cameras
        const customerIds = caregiverToCustomers[userId] || [];
        let extraTotal = 0;
        let extraActive = 0;
        for (const cid of customerIds) {
          extraTotal += Number(camerasTotalMap[cid] ?? 0);
          extraActive += Number(camerasActiveMap[cid] ?? 0);
        }

        const total = ownTotal + extraTotal;
        const active = ownActive + extraActive;

        const alertsToday = Number(eventsMap[userId] ?? 0);

        const summary: UserSummary = {
          service_tier: 'Gói Cơ bản',
          latest_payment_status: 'pending',
          cameras_total: total,
          cameras_active: active,
          alerts_today: alertsToday,
          plan_name: (sub as any)?.plans?.name || 'Free',
          plan_code: (sub as any)?.plans?.code,
          camera_quota: (sub as any)?.plans?.camera_quota || 0,
          camera_quota_used: active,
          alerts_total: Number(eventsMap[userId] ?? 0),
          alerts_unresolved: 0,
          payments_total: 0,
          payments_pending: 0,
          subscription_status: 'active',
          subscription_expires_at: undefined,
        };

        // store in cache (best-effort)
        this._setSummaryCache(userId, summary);

        return summary;
      });
      rows = userSummaries;
    } catch (err: any) {
      // Xử lý lỗi: Nếu có bảng bị thiếu hoặc lỗi query, trả về giá trị mặc định
      const msg = String(err?.message || err);
      this.logger.warn(`getSummaries DB query failed: ${msg}`);
      if (
        err?.code === '42P01' || // Table không tồn tại
        msg.includes('user_preferences') ||
        msg.includes('camera_id') ||
        msg.includes('does not exist')
      ) {
        // Trả về map với giá trị mặc định cho tất cả users
        const defaultMap: Record<string, UserSummary> = {};
        for (const id of ids) {
          defaultMap[id] = {
            service_tier: 'Gói Cơ bản',
            latest_payment_status: 'pending',
            cameras_total: 0,
            cameras_active: 0,
            alerts_today: 0,
            // Giá trị mặc định cho plan
            plan_name: 'Gói Cơ bản',
            plan_code: 'basic',
            camera_quota: 1,
            camera_quota_used: 0,
            alerts_total: 0,
            alerts_unresolved: 0,
            payments_total: 0,
            payments_pending: 0,
            subscription_status: 'active',
            subscription_expires_at: undefined,
          };
        }
        return defaultMap;
      }
      throw err; // Rethrow lỗi nghiêm trọng
    }

    // Xử lý kết quả query và tạo map
    const map: Record<string, UserSummary> = {};
    for (const r of rows ?? []) {
      map[r.user_id] = {
        service_tier: r.service_tier ?? 'Gói Cơ bản',
        latest_payment_status: r.latest_payment_status ?? 'pending',
        cameras_total: Number(r.cameras_total ?? 0),
        cameras_active: Number(r.cameras_active ?? r.cameras_total ?? 0),
        alerts_today: Number(r.alerts_today ?? 0),
        // Thông tin plan với fallback
        plan_name: r.plan_name ?? 'Gói Cơ bản',
        plan_code: r.plan_code ?? 'basic',
        camera_quota: Number(r.camera_quota ?? 1),
        camera_quota_used: Number(r.camera_quota_used ?? 0),
        // Thống kê alerts
        alerts_total: Number(r.alerts_total ?? 0),
        alerts_unresolved: Number(r.alerts_unresolved ?? 0),
        // Thống kê payments
        payments_total: Number(r.payments_total ?? 0),
        payments_pending: Number(r.payments_pending ?? 0),
        subscription_status: r.subscription_status ?? 'active',
        subscription_expires_at: r.subscription_expires_at,
      };
    }

    // Đảm bảo tất cả user IDs được yêu cầu đều có trong kết quả
    // Nếu thiếu thì thêm với giá trị mặc định
    for (const id of ids) {
      if (!map[id]) {
        map[id] = {
          service_tier: 'Gói Cơ bản',
          latest_payment_status: 'pending',
          cameras_total: 0,
          cameras_active: 0,
          alerts_today: 0,
          // Giá trị mặc định
          plan_name: 'Gói Cơ bản',
          plan_code: 'basic',
          camera_quota: 5, // Giá trị cao hơn cho trường hợp đặc biệt
          camera_quota_used: 0,
          alerts_total: 0,
          alerts_unresolved: 0,
          payments_total: 0,
          payments_pending: 0,
          subscription_status: 'active',
          subscription_expires_at: undefined,
        };
      }
    }
    return map;
  }

  private _setSummaryCache(userId: string, summary: UserSummary) {
    try {
      this._summariesCache.set(userId, {
        data: summary,
        expiresAt: Date.now() + this._summariesCacheTtlMs,
      });
    } catch {
      // ignore cache set failures
    }
  }

  // ====== ADVANCED USER MANAGEMENT STUBS ======
  async resetPassword(user_id: string, newPassword: string): Promise<boolean> {
    const user = await this._usersRepo.findUserById(user_id);
    if (!user) throw new NotFoundException('User not found');
    const password_hash = await bcrypt.hash(newPassword, 10);
    await this._usersRepo.updateUser(user_id, { password_hash });

    // Send password reset confirmation email
    if (user.email) {
      await this._notificationService.sendPasswordResetEmail(user.email, 'password-reset-token');
    }

    return true;
  }

  async setStatus(user_id: string, status: 'active' | 'locked' | 'disabled'): Promise<boolean> {
    const user = await this._usersRepo.findUserById(user_id);
    if (!user) throw new NotFoundException('User not found');
    const is_active = status === 'active';
    await this._usersRepo.updateUser(user_id, { is_active });
    return true;
  }

  async setRole(user_id: string, role: string): Promise<boolean> {
    const user = await this._usersRepo.findUserById(user_id);
    if (!user) throw new NotFoundException('User not found');
    await this._usersRepo.updateUser(user_id, { role: role as any });
    return true;
  }

  async exportUsers(
    params: { format?: 'csv' | 'xlsx'; from?: string; to?: string } = {},
  ): Promise<Buffer> {
    // Basic logic: filter users by created_at (from, to), export as CSV or XLSX
    const { format = 'csv', from, to } = params;
    let where: any = {};
    if (from) where.created_at = { ...where.created_at, $gte: new Date(from) };
    if (to) where.created_at = { ...where.created_at, $lte: new Date(to) };
    const users = await this._usersRepo.findAllUsersWithOptions(where);
    // Convert to CSV (simple)
    if (format === 'csv') {
      const header = 'user_id,full_name,email,username,created_at\n';
      const rows = users.map(
        (u) => `${u.user_id},${u.full_name},${u.email},${u.username},${u.created_at.toISOString()}`,
      );
      return Buffer.from(header + rows.join('\n'));
    }
    // XLSX: return empty buffer (stub)
    return Buffer.from('');
  }

  async checkDuplicate(params: {
    email?: string;
    username?: string;
  }): Promise<{ email?: boolean; username?: boolean }> {
    // Basic logic: check if email or username exists
    const result: { email?: boolean; username?: boolean } = {};
    if (params.email) {
      const existed = await this._usersRepo.findByEmail(params.email);
      result.email = !!existed;
    }
    if (params.username) {
      const existed = await this._usersRepo.findAllUsersWithOptions({ username: params.username });
      result.username = existed.length > 0;
    }
    return result;
  }

  async getActivityLogs(user_id: string, limit = 50): Promise<any[]> {
    // Truy xuất logs từ bảng activity_logs using Prisma
    const logs = await this._activityLogsRepo.findByUserIdWithLimit(user_id, limit);
    return logs;
  }

  async getUserFcmTokens(userId: string): Promise<any[]> {
    try {
      // Lấy tất cả FCM tokens active của user using Prisma
      const fcmTokens = await this._fcmTokenRepo.findActiveFcmTokensByUserId(userId);

      // Trả về thông tin device với FCM token
      return fcmTokens.map((token: any) => ({
        device_id: token.device_id,
        platform: token.platform,
        app_version: token.app_version,
        device_model: token.device_model,
        os_version: token.os_version,
        fcm_token: token.token,
        is_active: token.is_active,
        last_used_at: token.last_used_at,
        updated_at: token.updated_at,
        created_at: token.created_at,
      }));
    } catch (error) {
      this.logger.error(`Error fetching FCM tokens for user ${userId}:`, error);
      throw error;
    }
  }

  async send2fa(user_id: string): Promise<boolean> {
    const user = await this._usersRepo.findUserById(user_id);
    if (!user) throw new NotFoundException('User not found');

    // Sinh mã 2FA ngẫu nhiên và lưu vào DB/tạm thời, gửi qua email hoặc SMS
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // For now, store in system settings
    await this._systemSettingsRepo.upsert2faCode(user_id, code);

    // Send 2FA code via email (preferred) or SMS
    let sent = false;
    if (user.email) {
      sent = await this._notificationService.send2FACodeEmail(user.email, code);
    }

    // If email fails or no email, try SMS
    if (!sent && user.phone_number) {
      sent = await this._notificationService.send2FACodeSMS(user.phone_number, code);
    }

    if (!sent) {
      this.logger.warn(
        `Failed to send 2FA code for user ${user_id} - no email or phone configured`,
      );
    }

    return sent;
  }

  async verify2fa(user_id: string, code: string): Promise<boolean> {
    // For now, check the user settings for 2FA code
    const setting = await this._systemSettingsRepo.find2faCode(user_id);

    if (!setting || setting.value !== code) {
      return false;
    }

    // Check if code is not expired
    const expiresAt = new Date(setting.updated_at.getTime() + 5 * 60 * 1000);
    if (new Date() > expiresAt) {
      return false;
    }

    // Clear the code after successful verification
    await this._systemSettingsRepo.delete2faCode(user_id);

    return true;
  }
}

export interface UserSummary {
  service_tier: string; // Cấp độ dịch vụ (hiện tại là "Gói Cơ bản")
  latest_payment_status: string; // Trạng thái payment mới nhất ('paid', 'pending', 'failed', 'canceled')
  cameras_total: number; // Tổng số camera (hiện tại chưa implement, luôn = 0)
  cameras_active: number; // Số camera đang active (hiện tại chưa implement, luôn = 0)
  alerts_today: number; // Số cảnh báo trong ngày hôm nay

  // Thông tin plan hiện tại
  plan_name?: string; // Tên plan (VD: "Gói Cơ bản", "Gói Nâng cao")
  plan_code?: string; // Mã plan (VD: "basic", "pro")
  camera_quota?: number; // Giới hạn số camera được phép
  camera_quota_used?: number; // Số camera đã sử dụng (hiện tại luôn = 0)

  // Thống kê alerts
  alerts_total?: number; // Tổng số cảnh báo từ trước đến nay
  alerts_unresolved?: number; // Số cảnh báo chưa xử lý (status = 'danger' hoặc 'warning')

  // Thống kê payments
  payments_total?: number; // Tổng số payments
  payments_pending?: number; // Số payments đang pending

  // Thông tin subscription
  subscription_status?: string; // Trạng thái subscription ('active', 'trialing', etc.)
  subscription_expires_at?: string; // Thời điểm subscription hết hạn (ISO string)
}
