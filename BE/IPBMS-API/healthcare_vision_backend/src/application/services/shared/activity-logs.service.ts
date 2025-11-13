import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ExportActivityLogsDto } from '../../../application/dto/activity-logs/export-activity-logs.dto';
import { ActivityLog, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { ActivityLogsRepository } from '../../../infrastructure/repositories/shared/activity-logs.repository';
import { SystemConfigRepository } from '../../../infrastructure/repositories/system/system-config.repository';
import { UserPreferencesRepository } from '../../../infrastructure/repositories/users/user-preferences.repository';
import { SharedPermissionsService } from './shared-permissions.service';

@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger(ActivityLogsService.name);

  constructor(
    private readonly repo: ActivityLogsRepository,
    private readonly systemSettingsRepo: SystemConfigRepository,
    private readonly userSettingsRepo: UserPreferencesRepository,
    private readonly sharedPermissions: SharedPermissionsService,
  ) {}

  private async getSystemSettingValue(key: string): Promise<string | null> {
    const setting = await this.systemSettingsRepo.get(key);
    return setting?.value ?? null;
  }

  private async getSystemBoolean(key: string): Promise<boolean> {
    // Đọc đúng bảng mà bạn đang seed (chỉ 1 bảng!):
    // - Nếu dự án bạn dùng system_config:
    //   const row = await this.prisma.system_config.findUnique({ where: { setting_key: key }, select: { setting_value: true } });
    // - Nếu dùng system_settings, đổi tên bảng tương ứng.

    const val = await this.getSystemSettingValue(key); // giữ nguyên hàm bạn đang có
    const s = (val ?? '').toString().trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' || s === 'on';
  }

  private async getSystemInt(key: string): Promise<number | null> {
    const value = await this.getSystemSettingValue(key);
    if (value === null || value === undefined) return null;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private splitSettingKey(fullKey: string) {
    const s = fullKey.trim();
    const i = s.indexOf('.');
    if (i > 0) return { category: s.slice(0, i), key: s.slice(i + 1), full: s };
    return { category: 'activity_log', key: s, full: s }; // mặc định
  }

  private async getUserBoolean(userId: string, settingKey: string): Promise<boolean> {
    const { category, key, full } = this.splitSettingKey(settingKey);

    // 1) chuẩn: ('activity_log','enabled')
    let rec = await this.userSettingsRepo.get(userId, category, key);

    // 2) legacy cùng category: ('activity_log','activity_log.enabled')
    if (!rec) rec = await this.userSettingsRepo.get(userId, category, full);

    // 3) legacy không category: tìm theo (user_id + full) — KHÔNG truyền category
    if (!rec) rec = await this.userSettingsRepo.get(userId, undefined, full);

    // 4) legacy không category: (user_id + key)
    if (!rec) rec = await this.userSettingsRepo.get(userId, undefined, key);

    if (!rec || !rec.is_overridden) {
      return this.getSystemBoolean(full); // system với full key
    }

    const v = String(rec.setting_value ?? '')
      .trim()
      .toLowerCase();
    return v === 'true' || v === '1' || v === 'yes' || v === 'on';
  }

  async findById(id: string): Promise<ActivityLog> {
    const log = await this.repo.findByIdPublic(id);
    if (!log) throw new NotFoundException('Activity log not found');
    return log;
  }

  findAll(): Promise<ActivityLog[]> {
    return this.repo.findAll();
  }

  findByUserId(userId: string): Promise<ActivityLog[]> {
    return this.repo.findByUserId(userId);
  }

  async create(data: Partial<ActivityLog>, opts?: { force?: boolean }) {
    if (opts?.force) {
      return this.repo.create(data); // BYPASS all flags
    }

    // ... phần tính enabled như bạn đang có
    const userId = data.actor_id ?? null;
    const [userOverrideRaw, systemDefaultRaw] = await Promise.all([
      userId ? this.getUserBoolean(userId, 'activity_log.enabled') : Promise.resolve(null),
      this.getSystemBoolean('activity_log.enabled'),
    ]);
    const userOverride = (userOverrideRaw ?? null) as boolean | null;
    const systemDefault = !!systemDefaultRaw;
    const enabled = userOverride !== null ? userOverride : systemDefault;
    if (!enabled) return null;

    return this.repo.create(data);
  }

  async update(id: string, data: Partial<ActivityLog>): Promise<ActivityLog> {
    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundException('Activity log not found');
    return updated;
  }

  async remove(id: string) {
    return this.repo.remove(id);
  }

  async exportLogs(dto: ExportActivityLogsDto): Promise<{ data: string; filename: string }> {
    const logs = await this.repo.findWithFilters({
      userId: dto.userId,
      from: dto.from ? new Date(dto.from) : undefined,
      to: dto.to ? new Date(dto.to) : undefined,
      severity: dto.severity,
      action: dto.action,
    });

    if (dto.format === 'json') {
      return {
        data: JSON.stringify(logs, null, 2),
        filename: `activity-logs-${new Date().toISOString().split('T')[0]}.json`,
      };
    }

    // CSV format
    const csvHeaders = [
      'ID',
      'User ID',
      'Action',
      'Resource Type',
      'Resource Name',
      'Severity',
      'IP Address',
      'User Agent',
      'Created At',
      'Message',
    ];

    const csvRows = logs.map((log) => [
      log.id,
      log.actor_id || '',
      log.action,
      log.resource_type || '',
      log.resource_name || '',
      log.severity,
      log.ip || '',
      '',
      log.timestamp?.toISOString() || new Date().toISOString(),
      log.message || '',
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) => row.map((field) => `"${field}"`).join(','))
      .join('\n');

    return {
      data: csvContent,
      filename: `activity-logs-${new Date().toISOString().split('T')[0]}.csv`,
    };
  }

  async cleanupLogs() {
    const normalDays = await this.getSystemInt('activity_log.normal_retention_days');
    const abnormalDays = await this.getSystemInt('activity_log.abnormal_retention_days');

    await this.repo.deleteOlderThan({
      normalDays: normalDays ?? 30,
      abnormalDays: abnormalDays ?? 90,
    });

    this.logger.log(`🧹 Cleanup logs done. normal=${normalDays}, abnormal=${abnormalDays}`);
  }

  async findForCaregiverWithFeedback(caregiverId: string): Promise<ActivityLog[]> {
    const ownLogs = await this.repo.findByUserId(caregiverId);
    const feedbackLogs = await this.repo.findFeedbackAboutCaregiver(caregiverId);
    return [...ownLogs, ...feedbackLogs];
  }

  async findForCustomerWithCaregivers(
    customerId: string,
    actorName?: string,
  ): Promise<ActivityLog[]> {
    // Lấy danh sách caregiver có liên quan tới customer (assignment/shared-permissions)
    const caregivers = await this.sharedPermissions.getCaregiversOfCustomer(customerId); // bạn đã có helper này trước đó
    const caregiverIds = caregivers.map((c) => c.user_id);

    // Actor là chính customer + caregivers liên quan
    const actorIds = [customerId, ...caregiverIds];

    return this.repo.findLogs({
      actorIds,
      actorName, // 👈 filter theo tên caregiver (thực chất là actor_name)
    });
  }
  /** CUSTOMER: chỉ log của chính customer */
  async findCustomerSelfLogs(customerId: string): Promise<ActivityLog[]> {
    return this.repo.findByUserId(customerId);
  }

  /** CUSTOMER: chỉ log của các caregiver liên quan tới customer (có hỗ trợ filter theo tên) */
  async findCaregiversLogsForCustomer(
    customerId: string,
    actorName?: string,
  ): Promise<ActivityLog[]> {
    const caregivers = await this.sharedPermissions.getCaregiversOfCustomer(customerId);
    const caregiverIds = caregivers.map((c) => c.user_id);
    if (!caregiverIds.length) return [];
    return this.repo.findLogs({ actorIds: caregiverIds, actorName });
  }

  /** CAREGIVER: chỉ log của chính caregiver */
  async findCaregiverSelfLogs(caregiverId: string): Promise<ActivityLog[]> {
    return this.repo.findByUserId(caregiverId);
  }

  /** CAREGIVER: chỉ feedback của customer về caregiver */
  async findCaregiverFeedbackLogs(caregiverId: string): Promise<ActivityLog[]> {
    return this.repo.findFeedbackAboutCaregiver(caregiverId);
  }

  async logSettingChange(
    actorId: string,
    settingKey: string,
    changes: {
      oldValue?: any;
      newValue: any;
      source: 'system' | 'user';
      category?: string;
      dataType?: string;
      isOverride?: boolean;
      action: 'create' | 'update' | 'delete' | 'override' | 'reset';
    },
    options: {
      actorName?: string;
      severity?: ActivitySeverity;
      message?: string;
    } = {},
  ): Promise<ActivityLog | null> {
    const {
      oldValue,
      newValue,
      source,
      category = 'general',
      dataType = 'string',
      isOverride = false,
      action,
    } = changes;

    const { actorName, severity = ActivitySeverity.MEDIUM, message } = options;

    const meta = {
      setting_key: settingKey,
      category,
      data_type: dataType,
      source,
      is_override: isOverride,
      old_value: oldValue,
      new_value: newValue,
      change_type: action,
    };

    const defaultMessage = message || `Setting ${action}: ${category}.${settingKey} (${source})`;

    const log = await this.create({
      actor_id: actorId,
      actor_name: actorName,
      action: `setting_${action}`,
      resource_type: 'setting',
      resource_id: settingKey,
      resource_name: `${category}.${settingKey}`,
      message: defaultMessage,
      severity,
      meta,
    });

    // Check for critical settings and send alerts
    await this.checkCriticalSettingAlert(settingKey, category, changes, actorName || actorId);

    return log;
  }

  private async checkCriticalSettingAlert(
    settingKey: string,
    category: string,
    changes: any,
    actorIdentifier: string,
  ): Promise<void> {
    // Define critical settings that need alerts
    const criticalSettings = [
      'ai.threshold.fall_confidence',
      'notification.email.enabled',
      'system.security.enabled',
      'billing.payment.enabled',
    ];

    const fullKey = category ? `${category}.${settingKey}` : settingKey;

    if (criticalSettings.includes(fullKey)) {
      // This is a critical setting change - create high severity alert
      await this.create({
        actor_id: actorIdentifier,
        actor_name: actorIdentifier,
        action: 'critical_setting_change',
        resource_type: 'setting',
        resource_id: settingKey,
        resource_name: fullKey,
        message: `🚨 CRITICAL SETTING CHANGED: ${fullKey} - ${changes.oldValue} → ${changes.newValue}`,
        severity: ActivitySeverity.CRITICAL,
        meta: {
          ...changes,
          alert_type: 'critical_setting_change',
          requires_attention: true,
        },
      });

      // TODO: Here you could integrate with notification service to send emails/SMS
      // await this.notificationService.sendCriticalAlert({
      //   title: 'Critical Setting Changed',
      //   message: `Setting ${fullKey} was changed from ${changes.oldValue} to ${changes.newValue}`,
      //   recipients: ['admin@company.com'],
      // });
    }
  }
}
