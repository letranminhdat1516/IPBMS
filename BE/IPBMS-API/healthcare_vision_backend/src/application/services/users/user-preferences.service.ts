import { Injectable, NotFoundException } from '@nestjs/common';
import { UserPreferencesRepository } from '../../../infrastructure/repositories/users/user-preferences.repository';
import { SystemConfigService } from '../system/system-config.service';
import { ActivityLogsService } from '../shared/activity-logs.service';

@Injectable()
export class UserPreferencesService {
  constructor(
    private readonly repo: UserPreferencesRepository,
    private readonly systemSettings: SystemConfigService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async list(user_id: string, category?: string) {
    const userSettings = await this.repo.list(user_id, category);

    // Dùng entity => property là key, value (TypeORM tự map sang setting_key/setting_value)
    const systemDefaults = await this.systemSettings.getSettingsByCategory(category ?? 'general');

    return systemDefaults.map((sys) => {
      const user = userSettings.find(
        (u) =>
          u.category === sys.category &&
          u.setting_key === sys.setting_key && // user.entity dùng setting_key
          u.is_overridden,
      );

      if (user) {
        return {
          ...user,
          setting_value: user.setting_value ?? sys.setting_value, // user.setting_value vs sys.setting_value
          source: 'user',
        };
      }

      return {
        user_id,
        category: sys.category,
        setting_key: sys.setting_key, // sys.setting_key từ entity (DB là setting_key)
        setting_value: sys.setting_value, // sys.setting_value từ entity (DB là setting_value)
        is_enabled: true,
        is_overridden: false,
        overridden_at: null,
        updated_by: sys.updated_by,
        updated_at: sys.updated_at,
        source: 'system',
      };
    });
  }

  async get(user_id: string, category: string, key: string) {
    const user = await this.repo.get(user_id, category, key);

    if (user && user.is_overridden) {
      return { ...user, source: 'user' };
    }

    const sys = await this.systemSettings.getByCategoryAndKey(category, key);
    if (!sys) throw new NotFoundException('Setting not found');

    return {
      user_id,
      category,
      setting_key: sys.setting_key, // entity property
      setting_value: sys.setting_value, // entity property
      is_enabled: true,
      is_overridden: false,
      overridden_at: null,
      updated_by: sys.updated_by,
      updated_at: sys.updated_at,
      source: 'system',
    };
  }

  async set(
    user_id: string,
    category: string,
    key: string,
    value?: string,
    is_enabled?: boolean,
    updatedBy?: string,
  ) {
    // Get old value for logging
    const oldSetting = await this.repo.get(user_id, category, key);
    const oldValue = oldSetting?.setting_value;

    const result = await this.repo.set(user_id, category, key, value, is_enabled, updatedBy);

    // Log the change
    if (updatedBy) {
      const action = oldSetting ? 'update' : 'create';
      await this.activityLogs.logSettingChange(
        updatedBy,
        key,
        {
          oldValue,
          newValue: value,
          source: 'user',
          category,
          action,
          isOverride: true,
        },
        {
          message: `Tùy chọn người dùng ${action}: ${category}.${key}`,
        },
      );
    }

    return result;
  }

  async toggle(
    user_id: string,
    category: string,
    key: string,
    enabled: boolean,
    updatedBy?: string,
  ) {
    // Get old value for logging
    const oldSetting = await this.repo.get(user_id, category, key);
    const oldEnabled = oldSetting?.is_enabled ?? true;

    const result = await this.repo.setToggle(user_id, category, key, enabled, updatedBy);

    // Log the change
    if (updatedBy) {
      await this.activityLogs.logSettingChange(
        updatedBy,
        key,
        {
          oldValue: oldEnabled,
          newValue: enabled,
          source: 'user',
          category,
          action: 'update',
          isOverride: true,
        },
        {
          message: `Bật/tắt tùy chọn người dùng: ${category}.${key} ${oldEnabled} → ${enabled}`,
        },
      );
    }

    return result;
  }

  async getInt(userId: string, key: string, category = 'activity_log'): Promise<number | null> {
    const user = await this.repo.get(userId, category, key);

    if (!user || !user.is_overridden) {
      return this.systemSettings.getInt(`${category}.${key}`);
    }

    const parsed = parseInt(user.setting_value ?? '', 10);
    return isNaN(parsed) ? null : parsed;
  }

  async getString(userId: string, key: string, category = 'activity_log'): Promise<string> {
    const user = await this.repo.get(userId, category, key);
    if (!user || !user.is_overridden) {
      return this.systemSettings.getString(`${category}.${key}`);
    }
    return user.setting_value;
  }

  async getBoolean(userId: string, key: string, category = 'activity_log'): Promise<boolean> {
    const user = await this.repo.get(userId, category, key);

    // Nếu user chưa setting → fallback system
    if (!user) {
      return this.systemSettings.getBoolean(`${category}.${key}`);
    }

    // Nếu user có setting mà override=false → fallback system
    if (!user.is_overridden) {
      return this.systemSettings.getBoolean(`${category}.${key}`);
    }

    // Nếu override=true → dùng giá trị user
    return user.setting_value === 'true' || user.setting_value === '1';
  }

  async getEffectiveSetting(
    key: string,
    options: { userId?: string; category?: string; fallback?: any } = {},
  ): Promise<{ value: any; source: 'user' | 'system' | 'fallback' }> {
    const { userId, category = 'general', fallback } = options;

    // Lấy system setting để biết data_type
    const systemSetting = await this.systemSettings.getByCategoryAndKey(category, key);
    if (!systemSetting) {
      if (fallback !== undefined) {
        return { value: fallback, source: 'fallback' };
      }
      throw new NotFoundException(`Cấu hình hệ thống không tìm thấy: ${category}.${key}`);
    }

    let value: string;
    let source: 'user' | 'system';

    if (userId) {
      // Kiểm tra user setting
      const userSetting = await this.repo.get(userId, category, key);
      if (userSetting && userSetting.is_overridden && userSetting.is_enabled) {
        value = userSetting.setting_value;
        source = 'user';
      } else {
        value = systemSetting.setting_value;
        source = 'system';
      }
    } else {
      value = systemSetting.setting_value;
      source = 'system';
    }

    // Parse theo data_type
    let parsedValue: any;
    switch (systemSetting.data_type) {
      case 'boolean':
        parsedValue = value === 'true' || value === '1';
        break;
      case 'int':
      case 'float':
        parsedValue = systemSetting.data_type === 'int' ? parseInt(value, 10) : parseFloat(value);
        if (isNaN(parsedValue)) {
          throw new Error(`Invalid ${systemSetting.data_type} value: ${value}`);
        }
        break;
      case 'json':
        try {
          parsedValue = JSON.parse(value);
        } catch (e) {
          throw new Error(`Invalid JSON value: ${value}`);
        }
        break;
      case 'string':
      default:
        parsedValue = value;
        break;
    }

    return { value: parsedValue, source };
  }

  async setUserSettingOverride(
    userId: string,
    key: string,
    value: any,
    options: { category?: string; enabled?: boolean; updatedBy?: string } = {},
  ): Promise<any> {
    const { category = 'general', enabled = true, updatedBy } = options;

    // Kiểm tra system setting tồn tại
    const systemSetting = await this.systemSettings.getByCategoryAndKey(category, key);
    if (!systemSetting) {
      throw new NotFoundException(`Cấu hình hệ thống không tìm thấy: ${category}.${key}`);
    }

    // Validate value theo data_type
    let stringValue: string;
    switch (systemSetting.data_type) {
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error(`Giá trị boolean không hợp lệ: ${value}`);
        }
        stringValue = value ? 'true' : 'false';
        break;
      case 'int':
        if (typeof value !== 'number' || !Number.isInteger(value)) {
          throw new Error(`Giá trị integer không hợp lệ: ${value}`);
        }
        stringValue = value.toString();
        break;
      case 'float':
        if (typeof value !== 'number') {
          throw new Error(`Giá trị float không hợp lệ: ${value}`);
        }
        stringValue = value.toString();
        break;
      case 'json':
        if (typeof value !== 'object') {
          throw new Error(`Giá trị JSON không hợp lệ: ${value}`);
        }
        stringValue = JSON.stringify(value);
        break;
      case 'string':
      default:
        stringValue = String(value);
        break;
    }

    // Get old value for logging
    const oldSetting = await this.repo.get(userId, category, key);
    const oldValue = oldSetting?.setting_value;

    // Set user setting với override
    const result = await this.repo.set(userId, category, key, stringValue, enabled, updatedBy);

    // Log the change
    if (updatedBy) {
      const action = oldSetting ? 'update' : 'create';
      await this.activityLogs.logSettingChange(
        updatedBy,
        key,
        {
          oldValue,
          newValue: stringValue,
          source: 'user',
          category,
          action,
          isOverride: true,
        },
        {
          message: `Ghi đè tùy chọn người dùng ${action}: ${category}.${key}`,
        },
      );
    }

    return result;
  }

  async resetUserSettingOverride(
    userId: string,
    key: string,
    options: { category?: string; updatedBy?: string } = {},
  ): Promise<any> {
    const { category = 'general', updatedBy } = options;

    // Get old value for logging
    const oldSetting = await this.repo.get(userId, category, key);
    const oldValue = oldSetting?.setting_value;

    // Reset by setting is_overridden = false (keep value null)
    const result = await this.repo.set(userId, category, key, undefined, true, updatedBy);

    // Log the reset
    if (updatedBy) {
      await this.activityLogs.logSettingChange(
        updatedBy,
        key,
        {
          oldValue,
          newValue: null,
          source: 'user',
          category,
          action: 'reset',
          isOverride: false,
        },
        {
          message: `Đặt lại tùy chọn người dùng về giá trị mặc định hệ thống: ${category}.${key}`,
        },
      );
    }

    return result;
  }
}
