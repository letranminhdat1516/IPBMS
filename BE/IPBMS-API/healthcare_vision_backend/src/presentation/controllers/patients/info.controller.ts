import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ErrorResponseDto } from '../../../application/dto/shared/error-response.dto';

import {
  ContactCreateDto,
  ContactUpdateDto,
  MedicalInfoUpsertDto,
} from '../../../application/dto/patient-info/medical-info.dto';
import { HabitItemDto } from '../../../application/dto/patient-info/patient-habits.dto';
import { SleepCheckinHistoryQueryDto } from '../../../application/dto/patient-info/sleep-checkin-history.dto';
import { SleepCheckinDto } from '../../../application/dto/patient-info/sleep-checkin.dto';
import {
  CreateMedicalInfoResponseDto,
  EmergencyContactDto,
  MedicalInfoResponseDto,
} from '../../../application/dto/user-detail/medical-info.dto';
import { AccessControlService } from '../../../application/services/access-control.service';
import { ActivityLogsService } from '../../../application/services/activity-logs.service';
import { PatientInfoService } from '../../../application/services/users';
import { CloudinaryService } from '../../../shared/services/cloudinary.service';

import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { SharedPermissionGuard } from '../../../shared/guards/shared-permission.guard';

// Activity log
import { PatientSleepService } from '@/application/services/users/patient-sleep.service';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { timeUtils } from '../../../shared/constants/time.constants';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { SharedPermission } from '../../../shared/decorators/shared-permission.decorator';
import type { JwtUser } from '../../../shared/types/auth.types';
import {
  buildActivityPayload,
  buildOptionalFields,
  buildOptionalNonNullFields,
  createErrorResponse,
  createSuccessResponse,
  parseISOToDate,
} from '../../../shared/utils';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';
import { UserDetailsSwagger } from '../../../swagger/user-details.swagger';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SharedPermissionGuard)
@Roles('admin', 'caregiver', 'customer')
@Controller('patients/:id')
export class PatientsInfoController {
  private readonly logger = new Logger(PatientsInfoController.name);
  constructor(
    private readonly _svc: PatientInfoService,
    private readonly _acl: AccessControlService,
    private readonly _cloudinary: CloudinaryService,
    private readonly _activity: ActivityLogsService,
    private readonly _sleep: PatientSleepService,
  ) {}

  private async assertAccess(req: { user?: JwtUser }, id: string) {
    const role = req?.user?.role;
    const userId = req?.user?.userId;

    if (role === 'customer' && userId && userId !== id) {
      throw new ForbiddenException('Bạn chỉ có thể truy cập dữ liệu của chính mình');
    }
    if (role === 'caregiver' && userId && userId !== id) {
      const ok = await this._acl.caregiverCanAccessPatient(userId, id);
      if (!ok) throw new ForbiddenException('Caregiver chưa được phân công cho bệnh nhân này');
    }
  }

  // ================= PROFILE VIEW =================

  @Get('medical-info')
  @SharedPermission('profile:update')
  @ApiOperation({ summary: 'Lấy thông tin y tế của bệnh nhân' })
  @ApiOkResponse({ description: 'Thông tin y tế', type: MedicalInfoResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  async getMedicalInfo(@Param('id') id: string, @Req() req: { user?: JwtUser }) {
    await this.assertAccess(req, id);
    try {
      return await this._svc.getComposite(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const trace = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `[getMedicalInfo] Error while fetching composite medical info for ${id}: ${message}`,
        trace,
      );
      throw err;
    }
  }

  @Get('emergency-contacts')
  @SharedPermission('profile:view')
  @ApiOperation({ summary: 'Danh sách liên hệ khẩn' })
  @ApiOkResponse({ description: 'Danh sách liên hệ', type: [EmergencyContactDto] })
  async listContacts(@Param('id') id: string, @Req() req: { user?: JwtUser }) {
    await this.assertAccess(req, id);
    return this._svc.listContacts(id);
  }

  @Get('habits')
  @SharedPermission('profile:view')
  @ApiOperation({ summary: 'Danh sách thói quen' })
  @ApiOkResponse({ description: 'Danh sách thói quen', type: [HabitItemDto] })
  async listHabits(@Param('id') id: string, @Req() req: { user?: JwtUser }) {
    await this.assertAccess(req, id);
    return this._svc.listHabits(id); // service cần có
  }

  @Get('avatar')
  @SharedPermission('profile:view')
  @ApiOperation({ summary: 'Lấy avatar bệnh nhân' })
  @ApiOkResponse({
    description: 'Avatar',
    schema: { example: { avatarUrl: 'https://res.cloudinary.com/.../avatar.png' } },
  })
  async getAvatar(@Param('id') id: string, @Req() req: { user?: JwtUser }) {
    await this.assertAccess(req, id);
    return this._svc.getAvatar(id); // service cần có
  }

  // ================= CRUD (customer / admin) =================

  @Post('medical-info')
  @ApiOperation({ summary: 'Tạo mới hồ sơ y tế' })
  @ApiCreatedResponse({ description: 'Hồ sơ y tế đã được tạo', type: CreateMedicalInfoResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @LogActivity({
    action: 'create_medical_info',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo hồ sơ y tế',
    resource_type: 'medical_info',
    resource_name: 'medical_info',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  async createMedical(
    @Param('id') id: string,
    @Body() body: MedicalInfoUpsertDto,
    @Req() req: { user?: JwtUser },
  ) {
    const role = req?.user?.role;
    const userId = req?.user?.userId;
    if (role !== 'customer' || userId !== id) {
      throw new ForbiddenException('Chỉ khách hàng được phép tạo hồ sơ bệnh nhân của mình');
    }
    // Ensure the service receives the customer_id so patient_supplements.customer_id is set
    (body as any).customer_id = id;
    return this._svc.upsert(body);
  }

  @Put('medical-info')
  @ApiOperation({ summary: 'Cập nhật hồ sơ y tế' })
  @ApiOkResponse({
    description: 'Thông tin y tế đã được cập nhật',
    type: CreateMedicalInfoResponseDto,
  })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @LogActivity({
    action: 'update_medical_info',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật hồ sơ y tế',
    resource_type: 'medical_info',
    resource_name: 'medical_info',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async upsertMedical(
    @Param('id') id: string,
    @Body() body: MedicalInfoUpsertDto,
    @Req() req: { user?: JwtUser },
  ) {
    await this.assertAccess(req, id);
    // Ensure the service receives the customer_id so patient_supplements.customer_id is set
    (body as any).customer_id = id;
    return this._svc.upsert(body);
  }

  @Post('emergency-contacts')
  @ApiOperation({ summary: 'Tạo liên hệ khẩn' })
  @ApiCreatedResponse({ description: 'Liên hệ khẩn đã được tạo', type: EmergencyContactDto })
  @LogActivity({
    action: 'create_emergency_contact',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo liên hệ khẩn',
    resource_type: 'emergency_contact',
    resource_name: 'emergency_contact',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  async createContact(
    @Param('id') id: string,
    @Body() body: ContactCreateDto,
    @Req() req: { user?: JwtUser },
  ) {
    await this.assertAccess(req, id);
    return this._svc.createContact(id, body);
  }

  @Put('emergency-contacts/:contactId')
  @ApiOperation({ summary: 'Cập nhật liên hệ khẩn' })
  @ApiOkResponse({ description: 'Liên hệ khẩn đã được cập nhật', type: EmergencyContactDto })
  @LogActivity({
    action: 'update_emergency_contact',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật liên hệ khẩn',
    resource_type: 'emergency_contact',
    resource_name: 'emergency_contact',
    resource_id: 'contactId',
    severity: ActivitySeverity.MEDIUM,
  })
  async updateContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() body: ContactUpdateDto,
    @Req() req: { user?: JwtUser },
  ) {
    await this.assertAccess(req, id);
    return this._svc.updateContact(id, contactId, body);
  }

  @Delete('emergency-contacts/:contactId')
  @ApiOperation({ summary: 'Xoá liên hệ khẩn' })
  @ApiOkResponse({ description: 'Liên hệ khẩn đã bị xoá', schema: { example: { deleted: true } } })
  @LogActivity({
    action: 'delete_emergency_contact',
    action_enum: ActivityAction.DELETE,
    message: 'Xoá liên hệ khẩn',
    resource_type: 'emergency_contact',
    resource_name: 'emergency_contact',
    resource_id: 'contactId',
    severity: ActivitySeverity.HIGH,
  })
  async removeContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Req() req: { user?: JwtUser },
  ) {
    await this.assertAccess(req, id);
    return this._svc.removeContact(id, contactId);
  }

  @Post('habits')
  @ApiOperation({ summary: 'Thêm thói quen bệnh nhân' })
  @ApiCreatedResponse({ description: 'Thói quen đã được tạo', type: HabitItemDto })
  @LogActivity({
    action: 'add_habit',
    action_enum: ActivityAction.CREATE,
    message: 'Thêm thói quen',
    resource_type: 'habit',
    resource_name: 'habit',
    resource_id: 'id',
    severity: ActivitySeverity.LOW,
  })
  async addHabit(
    @Param('id') id: string,
    @Body() body: HabitItemDto,
    @Req() req: { user?: JwtUser },
  ) {
    await this.assertAccess(req, id);
    return this._svc.addHabit(id, body);
  }

  @Post('sleep-checkin')
  @ApiOperation({ summary: 'Điểm danh giấc ngủ' })
  @ApiCreatedResponse({
    description: 'Điểm danh đã được ghi nhận',
    schema: { example: { ok: true, log_id: 'uuid-or-temp', persisted: true } },
  })
  async sleepCheckin(
    @Param('id') id: string,
    @Body() body: SleepCheckinDto,
    @Req() req: { user?: JwtUser },
  ) {
    // id từ URL, nếu thiếu sẽ throw ngay để dễ debug
    if (!id) {
      console.warn(
        '[sleepCheckin] Missing :id in route. Did you forget @Post(":id/sleep-checkin")?',
      );
      throw new BadRequestException('Thiếu ID bệnh nhân trong đường dẫn');
    }

    await this.assertAccess(req, id);

    const actorId = getUserIdFromReq(req);
    const patientId = id;
    const actorName = actorId;
    const state = body?.state;
    if (!state) {
      throw new BadRequestException('Thiếu trạng thái cho điểm danh giấc ngủ');
    }

    const ts = parseISOToDate(body?.timestamp) ?? new Date();

    const payload = buildActivityPayload({
      actor_id: actorId,
      actor_name: actorName,
      action: 'sleep_checkin',
      resource_type: 'patient',
      resource_id: id,
      resource_name: `patient:${id}`,
      message: `Điểm danh giấc ngủ: ${body?.state}`,
      severity: ActivitySeverity.LOW,
      meta: {
        state,
        timestamp: ts.toISOString(),
        timestamp_local: timeUtils.toTimezoneIsoString(ts),
        source: body?.source ?? 'app',
        ...buildOptionalFields(['habit_id', 'medical_history_id', 'supplement_id'], body),
      },
    });
    let rec: any = null;
    try {
      rec = await this._activity.create(payload, { force: true });
      // Log the created record for debugging when persistence fails
      if (!rec) {
        this._activity['logger']?.warn?.(
          '[sleepCheckin] activity.create returned null or undefined',
          payload,
        );
      } else if (!rec.id) {
        this._activity['logger']?.warn?.(
          '[sleepCheckin] activity.create returned record without id',
          rec,
        );
      }
    } catch (err) {
      // Capture error and surface a helpful response while not failing the endpoint completely
      // but still record the failure in server logs for investigation
      try {
        this._activity['logger']?.error?.(
          `[sleepCheckin] Failed to create activity log: ${String(err)}`,
          err,
        );
      } catch {}
      // Return a standardized error response indicating the activity create failed
      return createErrorResponse('failed_to_create_activity_log', 'ACTIVITY_CREATE_FAILED', {
        details: String(err),
      });
    }

    const logId = rec?.id ?? null;
    const persisted = !!rec && typeof rec.id === 'string' && !rec.id.startsWith?.('TEMP-');

    // Also persist a daily sleep-checkin record for historical view (best-effort)
    try {
      const checkinMeta: any = {
        source: body?.source ?? 'app',
        activity_log_id: logId,
        ...buildOptionalNonNullFields(['habit_id', 'medical_history_id', 'supplement_id'], body),
      };

      const checkin = await this._sleep.upsertDailyCheckin(patientId, ts, state, checkinMeta);
      return createSuccessResponse({ log_id: logId, persisted, checkin });
    } catch (err) {
      // If sleep persistence fails, still return activity result but warn
      this._activity['logger']?.warn?.(
        '[sleepCheckin] failed to persist daily checkin: ' + String(err),
      );
      return createSuccessResponse({ log_id: logId, persisted });
    }
  }

  @Get('sleep-checkins')
  @SharedPermission('profile:view')
  @UserDetailsSwagger.sleepCheckinHistory
  async getSleepHistory(
    @Param('id') id: string,
    @Query() query: SleepCheckinHistoryQueryDto,
    @Req() req: { user?: JwtUser },
  ) {
    await this.assertAccess(req, id);
    const from = query?.from;
    const to = query?.to;
    const opts = {
      page: query?.page,
      limit: query?.limit,
      sortBy: query?.sortBy,
      order: query?.order,
      state: query?.state,
      source: query?.source,
    };
    return this._sleep.getHistory(id, from, to, opts);
  }

  @Put('habits/:habitId')
  @ApiOperation({ summary: 'Cập nhật thói quen bệnh nhân' })
  @ApiOkResponse({ description: 'Thói quen đã được cập nhật', type: HabitItemDto })
  @LogActivity({
    action: 'update_habit',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật thói quen',
    resource_type: 'habit',
    resource_name: 'habit',
    resource_id: 'habitId',
    severity: ActivitySeverity.MEDIUM,
  })
  async updateHabit(
    @Param('id') id: string,
    @Param('habitId') habitId: string,
    @Body() body: HabitItemDto,
    @Req() req: { user?: JwtUser },
  ) {
    await this.assertAccess(req, id);
    return this._svc.updateHabit(id, habitId, body);
  }

  @Delete('habits/:habitId')
  @ApiOperation({ summary: 'Xoá thói quen bệnh nhân' })
  @ApiOkResponse({ description: 'Thói quen đã bị xoá', schema: { example: { deleted: true } } })
  @LogActivity({
    action: 'delete_habit',
    action_enum: ActivityAction.DELETE,
    message: 'Xoá thói quen',
    resource_type: 'habit',
    resource_name: 'habit',
    resource_id: 'habitId',
    severity: ActivitySeverity.MEDIUM,
  })
  async removeHabit(
    @Param('id') id: string,
    @Param('habitId') habitId: string,
    @Req() req: { user?: JwtUser },
  ) {
    await this.assertAccess(req, id);
    return this._svc.removeHabit(id, habitId);
  }
}
