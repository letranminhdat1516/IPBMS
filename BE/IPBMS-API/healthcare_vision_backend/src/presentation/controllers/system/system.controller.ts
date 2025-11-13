import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  AIFrequencyConfigDto,
  CameraSettingsDto,
  ImageConfigDto,
  KnownSystemSettingKey,
  LogConfigDto,
  NotificationChannelsConfigDto,
} from '../../../application/dto/system/system-config.dto';
import { SettingsService } from '../../../application/services/settings.service';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { StringeeCallService } from '../../../infrastructure/external-apis/stringee/stringee-call.service';
import { StringeeSmsService } from '../../../infrastructure/external-apis/stringee/stringee-sms.service';
import { timeUtils } from '../../../shared/constants/time.constants';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { AuthenticatedRequest } from '../../../shared/types/auth.types';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';
import { SystemSwagger } from '../../../swagger/system.swagger';

@ApiTags('system')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('system')
export class SystemController {
  constructor(
    private readonly settings: SettingsService,
    private readonly stringeeSms: StringeeSmsService,
    private readonly stringeeCall: StringeeCallService,
  ) {}

  @Get('settings')
  @ApiQuery({
    name: 'keys',
    required: false,
    description: 'Comma-separated list of setting keys to fetch',
  })
  @SystemSwagger.getSettings
  async getSettings(@Query('keys') keys?: string) {
    if (!keys) {
      return this.settings.list();
    }
    const keyList = keys.split(',').map((k) => k.trim());
    const results: any = {};
    for (const key of keyList) {
      try {
        const setting = await this.settings.get(key);
        results[key] = JSON.parse(setting.value);
      } catch {
        results[key] = null;
      }
    }
    return results;
  }

  @Get('settings/:key')
  @SystemSwagger.getSettingKey
  async getSetting(@Param('key') key: KnownSystemSettingKey) {
    const setting = await this.settings.get(key);
    return {
      key: setting.key,
      value: JSON.parse(setting.value),
      updated_at: setting.updated_at,
      updated_at_local: timeUtils.toTimezoneIsoString((setting as any)?.updated_at),
    };
  }

  @Get('info')
  @SystemSwagger.getSystemInfo
  async getSystemInfo() {
    const os = require('os');
    const process = require('process');

    const now = new Date();

    return {
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        loadavg: os.loadavg(),
        totalmem: os.totalmem(),
        freemem: os.freemem(),
        cpus: os.cpus().length,
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
        versions: process.versions,
      },
      environment: {
        node_env: process.env.NODE_ENV,
        port: process.env.PORT,
        database_url: process.env.DATABASE_URL ? 'configured' : 'not configured',
        jwt_secret: process.env.JWT_SECRET ? 'configured' : 'not configured',
      },
      timestamp: now.toISOString(),
      timestamp_local: timeUtils.toTimezoneIsoString(now),
    };
  }

  @Get('forwarding-mode')
  @SystemSwagger.getForwardingMode
  async getForwardingMode() {
    try {
      const s = await this.settings.get('event_forward_mode');
      const val = (s && (s as any).value) ?? process.env.EVENT_FORWARD_MODE ?? 'timeout';
      // value may be stored as JSON string or plain string
      try {
        return { mode: JSON.parse(String(val)) };
      } catch {
        return { mode: String(val) };
      }
    } catch {
      const mode = process.env.EVENT_FORWARD_MODE ?? 'timeout';
      return { mode };
    }
  }

  @Put('forwarding-mode')
  @SystemSwagger.setForwardingMode
  @LogActivity({
    action: 'update_forwarding_mode',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật chế độ forward event tự động',
    resource_type: 'system_config',
    resource_id: 'event_forward_mode',
    severity: ActivitySeverity.HIGH,
  })
  async setForwardingMode(
    @Body() body: { mode: 'attempts' | 'timeout' },
    @Req() req: AuthenticatedRequest,
    @Query('dryRun') dryRun?: string,
  ) {
    const mode = body?.mode;
    if (!mode || (mode !== 'attempts' && mode !== 'timeout')) {
      throw new BadRequestException('mode phải là "attempts" hoặc "timeout"');
    }
    if (dryRun === '1') return { mode };
    let userId: string;
    try {
      userId = getUserIdFromReq(req);
    } catch {
      userId = 'system';
    }
    await this.settings.set('event_forward_mode', JSON.stringify(mode), userId);
    return { mode };
  }

  @Get('forwarding-thresholds')
  @SystemSwagger.getForwardingThresholds
  async getForwardingThresholds() {
    try {
      const s = await this.settings.get('event_forward_thresholds');
      const raw = (s && (s as any).value) ?? process.env.EVENT_FORWARD_THRESHOLDS ?? null;
      try {
        return JSON.parse(String(raw));
      } catch {
        // if it's a number string
        const n = Number(raw);
        if (!Number.isNaN(n)) return { default: n };
        return raw;
      }
    } catch {
      // fallback to env or defaults
      try {
        if (process.env.EVENT_FORWARD_THRESHOLDS)
          return JSON.parse(process.env.EVENT_FORWARD_THRESHOLDS);
      } catch {}
      const def = Number(process.env.EVENT_FORWARD_TIMEOUT_SECONDS) || 30;
      return { default: def };
    }
  }

  @Put('forwarding-thresholds')
  @SystemSwagger.setForwardingThresholds
  @LogActivity({
    action: 'update_forwarding_thresholds',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật thresholds cho forwarding timeout',
    resource_type: 'system_config',
    resource_id: 'event_forward_thresholds',
    severity: ActivitySeverity.HIGH,
  })
  async setForwardingThresholds(
    @Body() body: any,
    @Req() req: AuthenticatedRequest,
    @Query('dryRun') dryRun?: string,
  ) {
    // body can be number or object mapping
    if (typeof body !== 'number' && typeof body !== 'object') {
      throw new BadRequestException('Body phải là số hoặc object mapping event_type -> seconds');
    }
    const toStore = typeof body === 'number' ? String(body) : JSON.stringify(body);
    if (dryRun === '1') return { value: body };
    let userId: string;
    try {
      userId = getUserIdFromReq(req);
    } catch {
      userId = 'system';
    }
    await this.settings.set('event_forward_thresholds', toStore, userId);
    return { value: body };
  }

  @Post('notifications/test')
  @SystemSwagger.notificationTest
  @LogActivity({
    action: 'test_notifications',
    action_enum: ActivityAction.CREATE,
    message: 'Gửi thử thông báo hệ thống',
    resource_type: 'notification_test',
    severity: ActivitySeverity.MEDIUM,
  })
  async notificationTest(
    @Body()
    body: {
      channel: string;
      to: string;
      payload?: { title?: string; body: string };
    },
  ) {
    const { channel, to, payload } = body || ({} as any);
    if (!channel || !to || !payload || !payload.body) {
      throw new BadRequestException('Yêu cầu cung cấp channel, to và payload.body');
    }

    const isVnPhone = (num: string) => {
      const cleaned = String(num).replace(/\s+/g, '');
      return /^(+84|84|0)(3|5|7|8|9)[0-9]{8}$/.test(cleaned);
    };
    if ((channel === 'sms' || channel === 'call') && !isVnPhone(to)) {
      throw new BadRequestException('`to` phải là số điện thoại Việt Nam hợp lệ cho sms/call');
    }

    const s = await this.settings.get('notification_channels').catch(() => undefined as any);
    let cfg: any = undefined;
    if (s) {
      try {
        cfg = JSON.parse(s.value);
      } catch {
        cfg = undefined;
      }
    }

    const results: Array<any> = [];

    const doSms = async () => {
      if (cfg && cfg.enabled && cfg.enabled.sms === false) {
        results.push({ channel: 'sms', status: 'disabled' });
        return;
      }
      const ok = await this.stringeeSms.sendSms(to, payload.body);
      results.push({ channel: 'sms', status: ok ? 'sent' : 'failed' });
    };

    const doCall = async () => {
      if (cfg && cfg.enabled && cfg.enabled.call === false) {
        results.push({ channel: 'call', status: 'disabled' });
        return;
      }
      const ok = await this.stringeeCall.callAnnouncement(to, payload.body);
      results.push({ channel: 'call', status: ok ? 'sent' : 'failed' });
    };

    if (channel === 'sms') await doSms();
    else if (channel === 'call') await doCall();
    else if (channel === 'all') {
      await Promise.all([doSms(), doCall()]);
    } else {
      throw new BadRequestException('Kênh không được hỗ trợ');
    }

    return { ok: true, results };
  }

  @Put('settings/:key')
  @SystemSwagger.putSetting
  @ApiQuery({ name: 'dryRun', required: false, description: 'If 1 will not persist changes' })
  @LogActivity({
    action: 'update_system_config',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật cấu hình hệ thống',
    resource_type: 'system_config',
    resource_id: 'key',
    severity: ActivitySeverity.HIGH,
  })
  async putSetting(
    @Param('key') key: KnownSystemSettingKey,
    @Req() req: AuthenticatedRequest,
    @Body('value') value: any,
    @Query('dryRun') dryRun?: string,
  ) {
    let toStore: string;
    switch (key) {
      case 'camera': {
        if (typeof value === 'string') {
          const m = value.match(/^(\d+)\s*,\s*(\d+)%?$/);
          if (!m) {
            throw new BadRequestException(
              'Giá trị camera phải có định dạng "COUNT,QUALITY%" ví dụ: "30,80%"',
            );
          }
          const count = Number(m[1]);
          const quality_percent = Number(m[2]);
          const quality = quality_percent >= 80 ? 'high' : quality_percent >= 50 ? 'medium' : 'low';
          const normalized = { enable: true, count, quality_percent, quality };
          validateDto(normalized, CameraSettingsDto);
          toStore = JSON.stringify(normalized);
        } else {
          validateDto(value, CameraSettingsDto);
          toStore = JSON.stringify(value);
        }
        break;
      }
      case 'image_config': {
        validateDto(value, ImageConfigDto);
        toStore = JSON.stringify(value);
        break;
      }
      case 'notification_channels': {
        validateDto(value, NotificationChannelsConfigDto);
        toStore = JSON.stringify(value);
        break;
      }
      case 'ai_frequency': {
        validateDto(value, AIFrequencyConfigDto);
        toStore = JSON.stringify(value);
        break;
      }
      case 'log_config': {
        validateDto(value, LogConfigDto);
        toStore = JSON.stringify(value);
        break;
      }
      default: {
        throw new BadRequestException('Khóa không hợp lệ');
      }
    }
    const userId = req.user?.userId ?? req.user?.sub ?? 'system';
    if (dryRun === '1') {
      const now = new Date();
      return {
        key,
        value: JSON.parse(toStore),
        updated_at: now.toISOString(),
        updated_at_local: timeUtils.toTimezoneIsoString(now),
      };
    }
    const saved = await this.settings.set(key, toStore, userId);
    const keyOut = (saved as any)?.key ?? key;
    const valOutRaw = (saved as any)?.value ?? toStore;
    const updatedAtOut = (saved as any)?.updated_at ?? new Date().toISOString();
    return {
      key: keyOut,
      value: JSON.parse(String(valOutRaw)),
      updated_at: updatedAtOut,
      updated_at_local: timeUtils.toTimezoneIsoString(updatedAtOut),
    };
  }

  @Post('emergency-protocols')
  @SystemSwagger.emergencyProtocols.upsert
  @LogActivity({
    action: 'upsert_emergency_protocols',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật phác đồ khẩn cấp',
    resource_type: 'emergency_protocols',
    severity: ActivitySeverity.HIGH,
  })
  async upsertEmergencyProtocols(
    @Body() items: { name: string; steps: string[] }[],
    @Req() req: AuthenticatedRequest,
  ) {
    if (!Array.isArray(items)) {
      throw new BadRequestException('Body phải là một mảng');
    }
    for (const it of items) {
      if (!it || typeof it !== 'object') {
        throw new BadRequestException('Protocol item không hợp lệ');
      }
      if (!it.name || typeof it.name !== 'string') {
        throw new BadRequestException('Trường name là bắt buộc');
      }
      if (!Array.isArray(it.steps)) {
        throw new BadRequestException('steps phải là một mảng chứa các chuỗi JSON');
      }
      if (!it.steps.every((s) => typeof s === 'string')) {
        throw new BadRequestException('Mỗi bước phải là một chuỗi JSON');
      }
      for (const s of it.steps) {
        try {
          const obj = JSON.parse(s);
          if (
            !obj ||
            typeof obj !== 'object' ||
            !['detect', 'notify', 'support', 'other'].includes(obj.type) ||
            typeof obj.title !== 'string' ||
            typeof obj.desc !== 'string'
          ) {
            throw new Error('invalid step shape');
          }
        } catch {
          throw new BadRequestException('JSON bước không hợp lệ: ' + s);
        }
      }
    }
    let userId: string;
    try {
      userId = getUserIdFromReq(req);
    } catch {
      userId = 'system';
    }
    const payload = JSON.stringify(items);
    const saved = await this.settings.set('emergency_protocols', payload, userId);
    const value = (saved as any)?.value ?? payload;
    return JSON.parse(String(value));
  }
}

function assertShape<T>(v: unknown): asserts v is T {
  if (v === null || typeof v !== 'object') {
    throw new BadRequestException('value must be an object');
  }
}

function validateDto<T>(value: unknown, cls: new () => T) {
  assertShape<T>(value);
  const inst = plainToInstance(cls as any, value);
  const errs = validateSync(inst as any, { whitelist: true });
  if (errs.length) {
    throw new BadRequestException(
      'Payload invalid: ' + JSON.stringify(errs.map((e) => e.constraints)),
    );
  }
}
