import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from '../../../application/services/users';
import { UserPreferencesService } from '../../../application/services/users/user-preferences.service';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { MeSwagger } from '../../../swagger/me.swagger';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';

import { getUserIdFromReq } from '../../../shared/utils/auth.util';
import type { AuthenticatedRequest } from '../../../shared/types/auth.types';

// Using shared AuthenticatedRequest and getUserIdFromReq; no local JwtUser needed

@ApiTags('me')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@Controller()
export class MeController {
  constructor(
    private readonly users: UsersService,
    private readonly userPreferences: UserPreferencesService,
  ) {}

  private async readJson(userId: string, key: string) {
    try {
      const s = await this.userPreferences.get(userId, 'profile', key);
      return s?.setting_value ? JSON.parse(s.setting_value) : undefined;
    } catch {
      return undefined;
    }
  }

  private async writeJson(userId: string, key: string, value: unknown) {
    return this.userPreferences.set(userId, 'profile', key, JSON.stringify(value), true, userId);
  }

  @Get('me/profile')
  @MeSwagger.getProfile
  async getProfile(@Req() req: AuthenticatedRequest) {
    const id = getUserIdFromReq(req);
    const u = await this.users.findById(id);
    const extras = (await this.readJson(id, 'profile')) || {};
    return {
      username: u.username,
      email: u.email,
      bio: extras.bio ?? null,
      urls: Array.isArray(extras.urls) ? extras.urls : [],
    };
  }

  @Put('me/profile')
  @MeSwagger.putProfile
  @LogActivity({
    action: 'update_my_profile',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật hồ sơ cá nhân',
    resource_type: 'me:profile',
    resource_id: 'userId',
    severity: ActivitySeverity.MEDIUM,
  })
  async putProfile(
    @Req() req: AuthenticatedRequest,
    @Body() body: { bio?: string; urls?: Array<{ value: string } | string> },
  ) {
    const id = getUserIdFromReq(req);
    const current = (await this.readJson(id, 'profile')) || {};
    const urls = Array.isArray(body.urls)
      ? body.urls.map((u) => (typeof u === 'string' ? { value: u } : u))
      : (current.urls ?? []);
    const next = { ...current, bio: body.bio ?? current.bio ?? null, urls };
    await this.writeJson(id, 'profile', next);
    return next;
  }

  @Get('me/account')
  @MeSwagger.getAccount
  async getAccount(@Req() req: AuthenticatedRequest) {
    const id = getUserIdFromReq(req);
    const u = await this.users.findById(id);
    const acc = (await this.readJson(id, 'account')) || {};
    return {
      name: u.full_name,
      dob: u.date_of_birth ?? null,
      language: acc.language ?? 'en',
    };
  }

  @Put('me/account')
  @MeSwagger.putAccount
  @LogActivity({
    action: 'update_my_account',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật tài khoản cá nhân',
    resource_type: 'me:account',
    resource_id: 'userId',
    severity: ActivitySeverity.MEDIUM,
  })
  async putAccount(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name?: string; dob?: string; language?: string },
  ) {
    const id = getUserIdFromReq(req);
    const toUpdate: any = {};
    if (typeof body.name === 'string') toUpdate.full_name = body.name;
    if (typeof body.dob === 'string') toUpdate.date_of_birth = body.dob;
    if (Object.keys(toUpdate).length) await this.users.update(id, toUpdate);

    const current = (await this.readJson(id, 'account')) || {};
    const next = {
      ...current,
      language: body.language ?? current.language ?? 'en',
    };
    await this.writeJson(id, 'account', next);
    return next;
  }

  @Get('me/preferences/appearance')
  @MeSwagger.getAppearance
  async getAppearance(@Req() req: AuthenticatedRequest) {
    const id = getUserIdFromReq(req);
    const p = (await this.readJson(id, 'preferences:appearance')) || {};
    return { theme: p.theme ?? 'light', font: p.font ?? 'Inter' };
  }

  @Put('me/preferences/appearance')
  @MeSwagger.putAppearance
  @LogActivity({
    action: 'update_my_preferences_appearance',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật tuỳ chọn giao diện',
    resource_type: 'me:preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async putAppearance(
    @Req() req: AuthenticatedRequest,
    @Body() body: { theme?: 'light' | 'dark'; font?: string },
  ) {
    const id = getUserIdFromReq(req);
    const current = (await this.readJson(id, 'preferences:appearance')) || {};
    const next = {
      theme: body.theme ?? current.theme ?? 'light',
      font: body.font ?? current.font ?? 'Inter',
    };
    await this.writeJson(id, 'preferences:appearance', next);
    return next;
  }

  @Get('me/preferences/notifications')
  @MeSwagger.getNotifications
  async getNotifications(@Req() req: AuthenticatedRequest) {
    const id = getUserIdFromReq(req);
    const p = (await this.readJson(id, 'preferences:notifications')) || {};
    return {
      type: p.type ?? 'all',
      mobile: Boolean(p.mobile ?? true),
      communication_emails: Boolean(p.communication_emails ?? true),
      social_emails: Boolean(p.social_emails ?? false),
      marketing_emails: Boolean(p.marketing_emails ?? false),
      security_emails: Boolean(p.security_emails ?? true),
    };
  }

  @Put('me/preferences/notifications')
  @MeSwagger.putNotifications
  @LogActivity({
    action: 'update_my_preferences_notifications',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật tuỳ chọn thông báo',
    resource_type: 'me:preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async putNotifications(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      type?: 'all' | 'mentions' | 'none';
      mobile?: boolean;
      communication_emails?: boolean;
      social_emails?: boolean;
      marketing_emails?: boolean;
      security_emails?: boolean;
    },
  ) {
    const id = getUserIdFromReq(req);
    const current = (await this.readJson(id, 'preferences:notifications')) || {};
    const next = { ...current, ...body };
    await this.writeJson(id, 'preferences:notifications', next);
    return next;
  }

  @Get('me/preferences/display')
  @MeSwagger.getDisplay
  async getDisplay(@Req() req: AuthenticatedRequest) {
    const id = getUserIdFromReq(req);
    const p = (await this.readJson(id, 'preferences:display')) || {};
    return { items: Array.isArray(p.items) ? p.items : [] };
  }

  @Put('me/preferences/display')
  @MeSwagger.putDisplay
  @LogActivity({
    action: 'update_my_preferences_display',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật tuỳ chọn hiển thị',
    resource_type: 'me:preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async putDisplay(@Req() req: AuthenticatedRequest, @Body() body: { items?: string[] }) {
    const id = getUserIdFromReq(req);
    const next = { items: Array.isArray(body.items) ? body.items : [] };
    await this.writeJson(id, 'preferences:display', next);
    return next;
  }
}
