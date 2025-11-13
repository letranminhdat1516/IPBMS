import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
  Optional,
} from '@nestjs/common';
import { createBadRequestException, createForbiddenException } from '../../../shared/utils';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import {
  ConfirmationHistoryResponseDto,
  ConfirmationStatsDto,
  PendingProposalsResponseDto,
  ProposalsResponseDto,
} from '../../../application/dto/events/event-confirmation-response.dto';
import { ProposalDetailsResponseDto } from '../../../application/dto/events/event-confirmation-response.dto';
import { AccessControlService } from '../../../application/services/access-control.service';
import {
  EventConfirmationService,
  EventsService,
  EventValidationService,
} from '../../../application/services/events';
import { EventAuditLogService } from '../../../application/services/events/event-audit-log.service';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { EventDetectionsService } from '../../../application/services/events/event-detections.service';
import { SnapshotsService } from '../../../application/services/media/snapshots.service';
import {
  EventStatusEnum,
  EventTypeEnum,
  EventLifecycleEnum,
} from '../../../core/entities/events.entity';
import { EventDetection } from '../../../core/entities/event-detections.entity';
import { CaregiversRepository } from '../../../infrastructure/repositories/users/caregivers.repository';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ApproveEventDto } from '../../../application/dto/events/approve-event.dto';
import { ProposeEventDto } from '../../../application/dto/events/propose-event.dto';
import { RejectEventDto } from '../../../application/dto/events/reject-event.dto';
import { TIME_LIMITS_MS, timeUtils } from '../../../shared/constants/time.constants';
import { ReportAccess } from '../../../shared/decorators/report-access.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { ReportAccessGuard } from '../../../shared/guards/report-access.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { SharedPermissionGuard } from '../../../shared/guards/shared-permission.guard';
import { AuthenticatedRequest } from '../../../shared/types/auth.types';
import { EventsSwagger } from '../../../swagger/events.swagger';
import { parseExpandLimit, DEFAULT_EXPAND_LIMIT } from '../../../shared/utils/expand-limit.util';
import { ChangedEventsResponseDto } from '../../../application/dto/events/changed-events-response.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AlarmTriggerDto } from '../../../application/dto/events/alarm-trigger.dto';
import { CreateEventWithNotificationDto } from '../../../application/dto/events/create-event-with-notification.dto';

@ApiTags('events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SharedPermissionGuard, ReportAccessGuard)
@Roles('admin', 'customer', 'caregiver')
@Controller('events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);
  constructor(
    private readonly _service: EventsService,
    private readonly _acl: AccessControlService,
    private readonly _caregiversRepo: CaregiversRepository,
    private readonly _eventConfirmationService: EventConfirmationService,
    private readonly _eventValidation: EventValidationService,
    private readonly _eventAuditLogService: EventAuditLogService,
    @Optional() private readonly _eventDetections?: EventDetectionsService,
    @Optional() private readonly _snapshotsService?: SnapshotsService,
  ) {}

  // ===== PUBLIC API ENDPOINTS =====

  // ---- LIST ALL EVENTS
  @Get()
  @EventsSwagger.list
  async listAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('lifecycle_state') lifecycle_state?: string,
    @Query('orderBy') orderBy?: 'created_at' | 'detected_at' | 'confidence_score',
    @Query('order') order?: 'ASC' | 'DESC',
    @Query('camera_id') camera_id?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const role = req?.user?.role;
    const requesterId: string | undefined = req?.user?.userId ?? req?.user?.userId;
    const filters = {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : undefined,
      dateFrom,
      dateTo,
      status: status ? status.split(',') : undefined,
      event_type: type ? type.split(',') : undefined,
      lifecycle_state: lifecycle_state ? lifecycle_state.split(',') : undefined,
      orderBy: orderBy || 'created_at',
      order: order || 'DESC',
      camera_id,
    } as any;
    // Validate event_type filter
    const validEventTypes = ['fall', 'abnormal_behavior', 'emergency', 'normal_activity', 'sleep'];
    if (filters.event_type && Array.isArray(filters.event_type)) {
      const invalidTypes = filters.event_type.filter((t: string) => !validEventTypes.includes(t));
      if (invalidTypes.length) {
        throw createBadRequestException(`Loại sự kiện không hợp lệ: ${invalidTypes.join(', ')}`);
      }
    }

    const validStatuses = Object.values(EventStatusEnum) as string[];
    if (filters.status && Array.isArray(filters.status)) {
      const invalidStatuses = filters.status.filter((s: string) => !validStatuses.includes(s));
      if (invalidStatuses.length) {
        throw createBadRequestException(`Trạng thái không hợp lệ: ${invalidStatuses.join(', ')}`);
      }
    }

    const allowedOrderFields = ['created_at', 'detected_at', 'confidence_score'];
    if (!allowedOrderFields.includes(filters.orderBy)) {
      throw createBadRequestException(`Trường orderBy không hợp lệ: ${filters.orderBy}`);
    }
    let result: any;
    switch (role) {
      case 'admin':
        result = await this._service.listPaginated(filters);
        break;
      case 'caregiver':
        if (!requesterId) throw createForbiddenException('Thiếu ID caregiver');
        result = await this._service.listPaginatedForCaregiver(requesterId, filters);
        break;
      case 'customer':
        if (!requesterId) throw createForbiddenException('Thiếu ID khách hàng');
        result = await this._service.listPaginatedForOwner(requesterId, filters);
        break;
      default:
        result = { items: [], total: 0, page: filters.page, limit: filters.limit };
    }
    return result;
  }

  // ---- RECENT EVENTS
  @Get('recent/:userId')
  @EventsSwagger.recent
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async recent(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Query('limit') limit?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const lim = limit ? Math.max(1, Math.min(200, Number(limit))) : 50;
    const role = req?.user?.role;
    const requesterId: string | undefined = req?.user?.userId ?? req?.user?.userId;
    if (role === 'caregiver' && requesterId !== userId) {
      const ok = await this._acl.caregiverCanAccessPatient(requesterId!, userId);
      if (!ok) throw new ForbiddenException('Caregiver chưa được phân công cho bệnh nhân này');
    }
    return this._service.recentByUser(userId, lim);
  }

  // GET /events/changed
  @Get('changed')
  @EventsSwagger.recent
  @ApiOperation({
    summary: 'Lấy danh sách các event có thay đổi (audit) gần đây',
    description:
      'Trả về danh sách các event có thay đổi gần đây dựa trên lịch sử audit. Có thể filter theo thời gian `since` và phân trang.',
  })
  @ApiQuery({
    name: 'since',
    required: false,
    description:
      'Lọc theo thời gian ISO (ví dụ 2025-10-20T00:00:00Z). Chỉ trả về events có thay đổi kể từ thời điểm này.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Số trang (keyset pagination)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Kích thước trang',
  })
  @ApiQuery({
    name: 'include_changes',
    required: false,
    description:
      'Nếu true, mở rộng mỗi event với danh sách các thay đổi chi tiết trong trường `changes`.',
  })
  @ApiQuery({
    name: 'expand_limit',
    required: false,
    schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
    description:
      'Số phần tử trong `changes` trả về cho mỗi event khi mở rộng. Mặc định 20, tối đa 100. Giá trị >100 sẽ bị clamp về 100. Giá trị <=0 hoặc không phải integer sẽ trả HTTP 400.',
  })
  @ApiQuery({
    name: 'summary',
    required: false,
    description:
      'Nếu true, chỉ trả về tóm tắt (không mở rộng `changes`), dùng để lấy nhanh danh sách các event đã thay đổi mà không cần chi tiết.',
  })
  @ApiResponse({
    status: 200,
    type: ChangedEventsResponseDto,
    description: 'Trả về danh sách events kèm meta phân trang',
  })
  async getChangedEvents(
    @Query('since') since?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('include_changes') include_changes?: string,
    @Query('expand_limit') expand_limit?: string,
    @Query('summary') summary?: string,
  ) {
    // caregivers should only see events for patients they can access - filtering is enforced in service/repo layer
    const opts = {
      since: since || undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    } as any;

    const base = await this._eventAuditLogService.getChangedEvents(opts);

    const includeChanges = String(include_changes || 'false').toLowerCase() === 'true';
    const isSummary = String(summary || 'false').toLowerCase() === 'true';
    const expandLimitParsed = expand_limit ? Number(expand_limit) : undefined;

    // If summary=true, return repository aggregated rows without performing N+1 expansion
    if (!includeChanges || isSummary) return base;

    // N+1: expand each event's history into changes using existing service helper
    const itemsWithChanges = await Promise.all(
      base.items.map(async (it) => {
        const rows = await this._eventAuditLogService.getHistoryForEvent(it.event_id);
        const expanded = this._eventAuditLogService.expandHistoryRow(
          rows[rows.length - 1] || ({} as any),
          {
            limit: expandLimitParsed,
          },
        );
        // expandHistoryRow expects a single history row; if none, return empty changes
        const changes = expanded?.changes ?? [];
        const change_count = expanded?.change_count ?? it.change_count;
        return { ...it, changes, change_count };
      }),
    );

    return { ...base, items: itemsWithChanges };
  }

  // GET /events/changed-by?actor_id=...
  @Get('changed-by')
  @EventsSwagger.changedBy
  @ApiOperation({
    summary: 'Lấy events được thay đổi bởi actor cụ thể (audit)',
    description:
      'Trả về các events mà actor (user/system) cụ thể đã thực hiện thay đổi. Phải truyền `actor_id` bằng UUID của actor.',
  })
  @ApiQuery({ name: 'actor_id', required: true, description: 'UUID của actor (bắt buộc)' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Số trang (keyset pagination)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Kích thước trang',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Lọc start ISO datetime (created_at >= from)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'Lọc end ISO datetime (created_at < to)',
  })
  @ApiQuery({
    name: 'include_changes',
    required: false,
    description:
      'Nếu true, mở rộng mỗi event với danh sách các thay đổi chi tiết trong trường `changes`.',
  })
  @ApiQuery({
    name: 'expand_limit',
    required: false,
    schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
    description:
      'Số phần tử trong `changes` trả về cho mỗi event khi mở rộng. Mặc định 20, tối đa 100. Giá trị >100 sẽ bị clamp về 100. Giá trị <=0 hoặc không phải integer sẽ trả HTTP 400.',
  })
  @ApiQuery({
    name: 'summary',
    required: false,
    description:
      'Nếu true, chỉ trả về tóm tắt (không mở rộng `changes`), dùng để lấy nhanh danh sách các event đã thay đổi mà không cần chi tiết.',
  })
  async getChangedByActor(
    @Query('actor_id') actor_id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('include_changes') include_changes?: string,
    @Query('expand_limit') expand_limit?: string,
    @Query('summary') summary?: string,
  ) {
    const opts: any = {
      actor_id: actor_id || undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      since: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };

    const base = await this._eventAuditLogService.getChangedEvents(opts);

    const includeChanges = String(include_changes || 'false').toLowerCase() === 'true';
    const isSummary = String(summary || 'false').toLowerCase() === 'true';
    const expandLimitParsed = expand_limit ? Number(expand_limit) : undefined;

    // If summary=true, return repository aggregated rows without performing N+1 expansion
    if (!includeChanges || isSummary) return base;

    const itemsWithChanges = await Promise.all(
      base.items.map(async (it) => {
        const rows = await this._eventAuditLogService.getHistoryForEvent(it.event_id);
        const expanded = this._eventAuditLogService.expandHistoryRow(
          rows[rows.length - 1] || ({} as any),
          {
            limit: expandLimitParsed,
          },
        );
        const changes = expanded?.changes ?? [];
        const change_count = expanded?.change_count ?? it.change_count;
        return { ...it, changes, change_count };
      }),
    );

    return { ...base, items: itemsWithChanges };
  }

  // GET /events/pending-proposals (get pending proposals for current user)
  @Get('pending-proposals')
  @EventsSwagger.pendingProposals
  @ApiOperation({
    summary: 'Lấy danh sách proposals đang chờ xử lý',
    description: `Lấy danh sách các proposals có confirmation_state = CAREGIVER_UPDATED.

**Customer:** Xem proposals mà caregivers đã đề xuất (cần phản hồi approve/reject).
**Caregiver:** Xem proposals mình đã tạo (đang chờ customer phản hồi).

**Response:** Array của events với các trường: event_id, confirmation_state, proposed_status, proposed_event_type, proposed_by, pending_until, pending_reason.

**Use case:**
- Customer: Hiển thị notifications cần xử lý
- Caregiver: Theo dõi proposals đang chờ
  
**Note:** Không cần SharedPermission guard vì endpoint này chỉ trả về proposals của chính user đó.`,
  })
  @ApiResponse({ status: 200, type: PendingProposalsResponseDto })
  @Roles('customer', 'caregiver')
  async getPendingProposals(@Req() req?: AuthenticatedRequest) {
    const role = req?.user?.role as 'customer' | 'caregiver';
    const userId = this._eventValidation.validateRequester(req?.user?.userId);
    return this._eventConfirmationService.getPendingProposals(userId, role);
  }

  // PATCH /events/:id/cancel -> cancel an event (set lifecycle_state = CANCELED)
  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Hủy một event (set lifecycle_state = CANCELED)',
    description: `
    Hủy một event bằng cách thay đổi lifecycle_state thành CANCELED.
    
    **Quyền truy cập:**
    - Admin: Có thể hủy bất kỳ event nào
    - Customer: Có thể hủy event của chính mình
    - Caregiver: Chỉ có thể hủy event của customer được assign
    
    **Hành động thực hiện:**
    - Cập nhật lifecycle_state = 'CANCELED'
    - Ghi log vào event_history với action 'CANCELED'
    - Đặt notification_attempts về 0 nếu có
    - Gửi notification nếu cần
    
    **Validation:**
    - Event phải tồn tại
    - Event không được ở trạng thái final (APPROVED/REJECTED)
    - User phải có quyền trên event đó
    `,
  })
  @ApiBody({
    description: 'Thông tin lý do hủy event',
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Lý do hủy event (tùy chọn)',
          example: 'Event không chính xác',
        },
      },
      required: [],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Event đã được hủy thành công',
    schema: {
      type: 'object',
      properties: {
        event_id: {
          type: 'string',
          format: 'uuid',
          description: 'ID của event đã hủy',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        lifecycle_state: {
          type: 'string',
          enum: ['CREATED', 'APPROVED', 'REJECTED', 'CANCELED'],
          description: 'Trạng thái lifecycle mới của event',
          example: 'CANCELED',
        },
        canceled_at: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          description: 'Thời gian event được hủy (có thể null nếu không có escalated_at)',
          example: '2025-11-04T10:30:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Event không hợp lệ hoặc đã ở trạng thái final',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User không có quyền hủy event này',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Event không tồn tại',
  })
  @Roles('admin', 'customer', 'caregiver')
  async cancelEvent(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { reason?: string },
    @Req() req?: AuthenticatedRequest,
  ) {
    const role = req?.user?.role;
    const actorId = req?.user?.userId;
    // Authorization checks: caregivers can cancel only for assigned customers - validated in service layer
    const updated = await this._service.updateLifecycle(
      id,
      'CANCELED' as any,
      actorId,
      role,
      body?.reason,
    );
    return this._normalizeCancelResponse(updated);
  }

  private _normalizeCancelResponse(updated: any) {
    return {
      event_id: updated.event_id,
      lifecycle_state: updated.lifecycle_state,
      canceled_at: updated.escalated_at ?? null,
    };
  }

  // GET /events/confirmation-history
  @Get('confirmation-history')
  @EventsSwagger.confirmationHistory
  @ApiOperation({
    summary: 'Lấy lịch sử confirmation của user',
    description: `Xem toàn bộ lịch sử confirmations của user.

**Response:** Array các confirmation records với thông tin:
- confirmation_state: Trạng thái (CONFIRMED_BY_CUSTOMER, REJECTED_BY_CUSTOMER)
  // NOTE: AUTO_APPROVED is historical only. Current policy: "silence != consent" —
  // pending proposals are not auto-approved. Historical AUTO_APPROVED values should be
  // normalized via migration when you are ready to remove historical values.
- acknowledged_at: Thời điểm phê duyệt/từ chối
- acknowledged_by: User thực hiện
- status/event_type: Giá trị đã áp dụng

**Use case:** Audit log, kiểm tra lịch sử confirmations
  
**Note:** Không cần SharedPermission guard vì endpoint này chỉ trả về history của chính user đó.`,
  })
  @ApiResponse({ status: 200, type: ConfirmationHistoryResponseDto })
  @Roles('customer', 'caregiver', 'admin')
  async getConfirmationHistory(@Req() req?: AuthenticatedRequest) {
    const role = req?.user?.role as 'customer' | 'caregiver';
    const userId = this._eventValidation.validateRequester(req?.user?.userId);
    return this._eventConfirmationService.getConfirmationHistory(userId, role);
  }

  // GET /events/confirmation-stats
  @Get('confirmation-stats')
  @ApiOperation({
    summary: 'Lấy thống kê confirmation',
    description: `Thống kê tổng quan về proposals và confirmations.

**Customer stats:**
- total_pending: Số proposals đang chờ xử lý
- total_confirmed: Số proposals đã approve
- total_rejected: Số proposals đã reject
- total_auto_approved: Số proposals tự động approve (hết hạn)
- average_response_time: Thời gian trung bình phản hồi (giây)

**Caregiver stats:**
- total_proposals_created: Tổng số proposals đã tạo
- pending: Đang chờ
- confirmed: Đã được approve
- rejected: Bị reject
- auto_approved: Tự động approve
- approval_rate: Tỷ lệ approve (%)

**Use case:** Dashboard, analytics, performance tracking
  
**Note:** Không cần SharedPermission guard vì endpoint này chỉ trả về stats của chính user đó.`,
  })
  @ApiResponse({ status: 200, type: ConfirmationStatsDto })
  @Roles('customer', 'caregiver')
  async getConfirmationStats(@Req() req?: AuthenticatedRequest) {
    const role = req?.user?.role as 'customer' | 'caregiver';
    const userId = this._eventValidation.validateRequester(req?.user?.userId);
    return this._eventConfirmationService.getConfirmationStats(userId, role);
  }

  // GET /events/proposals
  @Get('proposals')
  @EventsSwagger.proposals
  @ApiOperation({ summary: 'Lấy danh sách proposals (pending + confirmed/rejected)' })
  @ApiResponse({ status: 200, type: ProposalsResponseDto })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'all|pending|approved|rejected',
    example: 'all',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'ISO datetime start filter (created_at >= from)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'ISO datetime end filter (created_at < to)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'page size (keyset)', example: 20 })
  @Roles('customer', 'caregiver')
  async getReceivedProposals(
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const role = req?.user?.role as 'customer' | 'caregiver';
    const userId = this._eventValidation.validateRequester(req?.user?.userId);
    const opts = {
      status: status || 'all',
      from: from || undefined,
      to: to || undefined,
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
    } as any;
    return this._eventConfirmationService.getReceivedProposals(userId, role, opts);
  }

  // ---- EVENT DETAIL (moved below specific sub-routes to avoid dynamic route shadowing)

  // GET /events/:event_id/history
  @Get(':event_id/history')
  @ApiOperation({
    summary: 'Lấy lịch sử thay đổi (event history) của một event',
    description:
      'Trả về timeline các action liên quan đến event (proposed, confirmed, rejected, auto_rejected, ...)',
  })
  @ApiQuery({
    name: 'expand_limit',
    required: false,
    schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
    description:
      'Số phần tử trong `changes` trả về cho mỗi history entry khi mở rộng. Mặc định 20, tối đa 100. Giá trị >100 sẽ bị clamp về 100. Giá trị <=0 hoặc không phải integer sẽ trả HTTP 400.',
  })
  async getEventHistory(
    @Param('event_id', new ParseUUIDPipe({ version: '4' })) event_id: string,
    @Req() req?: AuthenticatedRequest,
    @Query('expand_limit') expand_limit?: string,
  ) {
    const role = req?.user?.role;
    const requesterId = req?.user?.userId;

    const event = await this._service.getDetail(event_id);
    if (!event) return null;

    if (role === 'caregiver') {
      if (!requesterId) throw new ForbiddenException('Người dùng chưa đăng nhập');
      const ok = await this._acl.caregiverCanAccessPatient(requesterId, event.user_id);
      if (!ok) throw new ForbiddenException('Caregiver not assigned to this patient');
    }

    // Delegate to audit log service (returns empty array if history table missing)
    const rows = await this._eventAuditLogService.getHistoryForEvent(event_id);
    const limParsed = parseExpandLimit(expand_limit);
    if (Number.isNaN(limParsed))
      throw new BadRequestException('expand_limit must be a positive integer');
    const lim = limParsed === undefined ? DEFAULT_EXPAND_LIMIT : limParsed;
    const history = rows.map((r) => this._eventAuditLogService.expandHistoryRow(r, { limit: lim }));
    return { event_id, history };
  }

  // GET /events/:event_id/proposal-details
  @Get(':event_id/proposal-details')
  @EventsSwagger.proposalDetails
  @ApiOperation({ summary: 'Lấy chi tiết proposal kèm lịch sử (proposal + timeline)' })
  @ApiResponse({ status: 200, type: ProposalDetailsResponseDto })
  async getProposalDetails(
    @Param('event_id', new ParseUUIDPipe({ version: '4' })) event_id: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const role = req?.user?.role;
    const requesterId = req?.user?.userId;

    const event = await this._service.getDetail(event_id);
    if (!event) return null;

    if (role === 'caregiver') {
      if (!requesterId) throw new ForbiddenException('Người dùng chưa đăng nhập');
      const ok = await this._acl.caregiverCanAccessPatient(requesterId, event.user_id);
      if (!ok) throw new ForbiddenException('Caregiver not assigned to this patient');
    }

    const details = await this._eventConfirmationService.getProposalDetails(event_id);
    if (!details) return null;
    return details;
  }

  // Generic event detail (placed after specific sub-routes)
  @Get(':event_id')
  @EventsSwagger.getDetail
  async getDetail(
    @Param('event_id', new ParseUUIDPipe({ version: '4' })) event_id: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const role = req?.user?.role;
    const requesterId = req?.user?.userId;
    const event = await this._service.getDetail(event_id);
    if (!event) return null;
    if (role === 'caregiver') {
      if (!requesterId) throw new ForbiddenException('Người dùng chưa đăng nhập');
      const ok = await this._acl.caregiverCanAccessPatient(requesterId, event.user_id);
      if (!ok) throw new ForbiddenException('Caregiver not assigned to this patient');
    }
    return event;
  }

  // ---- UPDATE STATUS
  @Patch(':event_id')
  @EventsSwagger.patchStatus
  @LogActivity({
    action: 'update_event_status',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật trạng thái và loại event',
    resource_type: 'event',
    resource_name: 'event_status',
    resource_id: 'event_id',
    severity: ActivitySeverity.MEDIUM,
  })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'notes', required: false })
  @ApiQuery({ name: 'event_type', required: false, enum: EventTypeEnum })
  async patchStatus(
    @Param('event_id', new ParseUUIDPipe({ version: '4' })) event_id: string,
    @Query('status') status: EventStatusEnum | null,
    @Query('notes') notes?: string,
    @Query('event_type') eventType?: EventTypeEnum,
    @Req() req?: AuthenticatedRequest,
  ) {
    const role = req?.user?.role;
    const requesterId = req?.user?.userId;
    if (role === 'caregiver') {
      if (!requesterId) throw new ForbiddenException('Người dùng chưa đăng nhập');

      const event = await this._service.getDetail(event_id);
      if (!event) return null;
      const detectedAtVal = event.detected_at ? new Date(event.detected_at).getTime() : null;
      if (detectedAtVal) {
        const ageMs = Date.now() - detectedAtVal;
        const limitMs = TIME_LIMITS_MS.CAREGIVER_ACCESS_WINDOW; // configurable
        if (ageMs > limitMs) {
          throw new BadRequestException('Khoảng thời gian caregiver có thể cập nhật đã hết');
        }
      }
      const ok = await this._acl.caregiverCanAccessPatient(requesterId, event.user_id);
      if (!ok) throw new ForbiddenException('Caregiver chưa được phân công cho bệnh nhân này');
    }
    return this._service.updateStatus(event_id, status, notes, eventType);
  }

  // ---- PROPOSE STATUS (caregiver only -> creates pending proposal customer must confirm)
  @Post(':event_id/propose')
  @EventsSwagger.propose
  @ApiOperation({
    summary: 'Caregiver đề xuất thay đổi trạng thái event (propose)',
    description:
      'Caregiver gửi đề xuất thay đổi trạng thái của một event để customer phê duyệt. Yêu cầu: người gọi phải có role=caregiver và còn trong cửa sổ thời gian caregiver được phép thao tác (48 giờ).',
  })
  @ApiBody({
    description: 'Dữ liệu đề xuất (proposed_status bắt buộc). Ví dụ:',
    schema: {
      example: {
        proposed_status: 'normal',
        proposed_event_type: 'normal_activity',
        pending_until: '2025-10-24T12:00:00.000Z',
        reason: 'Mô tả lý do (tùy chọn)',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Proposal tạo thành công. Trả về event đã được cập nhật (confirmation_state = CAREGIVER_UPDATED).',
  })
  @ApiResponse({
    status: 400,
    description: 'Yêu cầu không hợp lệ (ví dụ pending_until không hợp lệ hoặc đã hết thời gian).',
  })
  @ApiResponse({
    status: 401,
    description: 'Không được phép - token thiếu hoặc không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ caregiver được phép tạo proposal.',
  })
  @ApiResponse({
    status: 409,
    description: 'Đã tồn tại một proposal đang chờ xử lý cho event này.',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi server nội bộ.',
  })
  @Roles('caregiver')
  async proposeStatus(
    @Param('event_id', new ParseUUIDPipe({ version: '4' })) event_id: string,
    @Body() body: ProposeEventDto,
    @Req() req?: AuthenticatedRequest,
  ) {
    const requesterId = this._eventValidation.validateRequester(req?.user?.userId);
    const role = req?.user?.role;

    if (role !== 'caregiver') {
      throw new ForbiddenException('Chỉ caregiver được phép đề xuất trạng thái');
    }

    const { event } = await this._eventValidation.validateEventExists(event_id);
    await this._eventValidation.validateCaregiverAccess(
      requesterId,
      event.user_id,
      event.detected_at,
    );

    // Check remaining time in access window
    const remainingTime = timeUtils.getRemainingAccessTime(
      event.detected_at,
      TIME_LIMITS_MS.CAREGIVER_ACCESS_WINDOW,
    );

    if (!remainingTime) {
      throw new BadRequestException(
        'Đã hết thời gian được phép tạo đề xuất (quá 48h từ khi phát hiện)',
      );
    }

    // Minimum buffer: require at least 5 minutes remaining for customer to respond
    const MIN_BUFFER_MS = 5 * 60 * 1000; // 5 minutes
    if (remainingTime < MIN_BUFFER_MS) {
      throw new BadRequestException(
        `Không đủ thời gian để customer phản hồi. Còn ${Math.floor(remainingTime / 60000)} phút trong cửa sổ 48h.`,
      );
    }

    // Compute TTL from pending_until (default 48 hours)
    let ttl = TIME_LIMITS_MS.CAREGIVER_PROPOSAL_TTL; // configurable
    if (body.pending_until) {
      const pendingDate = new Date(body.pending_until);
      if (isNaN(pendingDate.getTime())) {
        throw new BadRequestException('Giá trị pending_until không hợp lệ');
      }
      const diff = pendingDate.getTime() - Date.now();
      // Validate pending_until: must be in future and not exceed max allowed TTL
      if (diff <= 0) {
        throw new BadRequestException('Giá trị pending_until phải lớn hơn thời gian hiện tại');
      }
      if (diff > TIME_LIMITS_MS.CAREGIVER_PROPOSAL_TTL) {
        throw new BadRequestException(
          `Giá trị pending_until không được vượt quá ${Math.floor(
            TIME_LIMITS_MS.CAREGIVER_PROPOSAL_TTL / (60 * 60 * 1000),
          )} giờ`,
        );
      }
      ttl = diff;
    }

    // Pass proposed_event_type only when provided to keep function arity compatible with existing tests/mocks
    if (typeof body.proposed_event_type !== 'undefined') {
      return this._eventConfirmationService.proposeChange(
        event_id,
        requesterId,
        body.proposed_status,
        ttl,
        body.reason,
        body.proposed_event_type,
      );
    }

    return this._eventConfirmationService.proposeChange(
      event_id,
      requesterId,
      body.proposed_status,
      ttl,
      body.reason,
    );
  }

  // POST /events/:event_id/confirm (customer approves a pending proposal)
  @Post(':event_id/confirm')
  @EventsSwagger.postConfirm
  @Roles('customer', 'caregiver')
  async postConfirm(
    @Param('event_id', new ParseUUIDPipe({ version: '4' })) event_id: string,
    @Body() body: ApproveEventDto,
    @Req() req?: AuthenticatedRequest,
  ) {
    const role = req?.user?.role || 'customer';
    const requesterId = this._eventValidation.validateRequester(req?.user?.userId);

    await this._eventValidation.validateEventAction(event_id, requesterId, role);

    // If the requester is a caregiver, call legacy EventsService.updateConfirm (tests and existing flows expect this)
    if (role === 'caregiver') {
      const confirmBool = (body as any)?.action === 'approve';
      const notesVal = (body as any)?.notes ?? (body as any)?.rejection_reason ?? undefined;
      return this._service.updateConfirm(event_id, confirmBool, notesVal, requesterId, 'caregiver');
    }

    // Otherwise, customer uses EventConfirmationService to confirm proposals
    return this._eventConfirmationService.confirmChange(event_id, requesterId);
  }

  // POST /events/:event_id/reject (customer rejects a pending proposal)
  @Post(':event_id/reject')
  @EventsSwagger.postReject
  @Roles('customer', 'caregiver')
  async postReject(
    @Param('event_id', new ParseUUIDPipe({ version: '4' })) event_id: string,
    @Body() body: RejectEventDto,
    @Req() req?: AuthenticatedRequest,
  ) {
    const role = req?.user?.role || 'customer';
    const requesterId = this._eventValidation.validateRequester(req?.user?.userId);

    await this._eventValidation.validateEventAction(event_id, requesterId, role);

    // If the requester is a caregiver, call legacy EventsService.updateConfirm (deny override path handled there)
    if (role === 'caregiver') {
      const notesVal = (body as any)?.notes ?? (body as any)?.rejection_reason ?? undefined;
      return this._service.updateConfirm(event_id, false, notesVal, requesterId, 'caregiver');
    }

    // Otherwise, customer uses EventConfirmationService to reject proposals
    // Presentation DTO carries optional notes; map it to rejection reason
    const reason = (body as any)?.rejection_reason ?? (body as any)?.notes ?? undefined;
    return this._eventConfirmationService.rejectChange(event_id, requesterId, reason);
  }

  // POST /events/:event_id/cancel-proposal (caregiver cancels their proposal)
  @Post(':event_id/cancel-proposal')
  @ApiOperation({
    summary: 'Caregiver hủy proposal của mình',
    description: `**[Caregiver only]** Hủy proposal đã tạo (chỉ khi confirmation_state = CAREGIVER_UPDATED).

**Flow:**
1. Kiểm tra caregiver là người tạo proposal (proposed_by)
2. Khôi phục status/event_type về giá trị cũ
3. Set confirmation_state = DETECTED
4. Xóa các trường proposal
5. Gửi thông báo cho customer

**Error codes:**
- 409: Không có proposal đang chờ để hủy (message: "Không có đề xuất nào đang chờ để hủy")
- 400: Chỉ hủy được proposal của mình (message: "Bạn chỉ có thể hủy đề xuất của chính mình")
- 403: Chỉ caregiver`,
  })
  @ApiResponse({ status: 200, description: 'Proposal đã được hủy thành công' })
  @ApiResponse({
    status: 409,
    description: 'Không có proposal đang chờ để hủy',
  })
  @ApiResponse({
    status: 400,
    description: 'Bạn chỉ có thể hủy đề xuất của chính mình',
  })
  @Roles('caregiver')
  async cancelProposal(
    @Param('event_id', new ParseUUIDPipe({ version: '4' })) event_id: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const caregiverId = this._eventValidation.validateRequester(req?.user?.userId);
    return this._eventConfirmationService.cancelProposal(event_id, caregiverId);
  }

  // ---- SNAPSHOTS
  @Get(':event_id/snapshots')
  @EventsSwagger.snapshots
  @ApiQuery({ name: 'windowSec', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getEventSnapshots(
    @Param('event_id', new ParseUUIDPipe({ version: '4' })) event_id: string,
    @Query('windowSec') windowSec?: string,
    @Query('limit') limit?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const role = req?.user?.role;
    const requesterId = req?.user?.userId;
    if (role === 'caregiver') {
      if (!requesterId) throw new ForbiddenException('Người dùng chưa đăng nhập');
      const patientUserId = await this._service.getEventOwnerUserId(event_id);
      if (!patientUserId) return { event_id, snapshots: [] };
      const ok = await this._acl.caregiverCanAccessPatient(requesterId, patientUserId);
      if (!ok) throw new ForbiddenException('Caregiver not assigned to this patient');
    }
    const w = typeof windowSec !== 'undefined' ? Math.max(0, Number(windowSec) || 0) : undefined;
    const l = typeof limit !== 'undefined' ? Math.max(1, Number(limit) || 1) : undefined;
    const snapshots = await this._service.getEventSnapshots(event_id, w, l);
    return { event_id, snapshots };
  }

  // ---- CREATE EVENT (Admin only)
  @Post()
  @Roles('admin')
  @ApiOperation({
    summary: 'Tạo event mới và gửi FCM notification tự động',
    description:
      'Chỉ admin được phép tạo event mới. Hệ thống sẽ tự động gửi thông báo đến customer và caregiver liên quan.',
  })
  @LogActivity({
    action: 'create_event',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo event mới với FCM notification',
    resource_type: 'event',
    resource_name: 'event',
    resource_id: '@result.event_id',
    severity: ActivitySeverity.HIGH,
  })
  async createEventWithNotification(
    @Body() eventData: CreateEventWithNotificationDto,
    @Req() req?: AuthenticatedRequest,
  ) {
    const role = req?.user?.role;
    if (role !== 'admin') {
      throw new ForbiddenException('Chỉ admin mới có thể tạo sự kiện');
    }
    return this._service.createEventWithNotification(eventData);
  }

  // ---- UPDATE LIFECYCLE STATE
  @Patch(':event_id/lifecycle')
  @EventsSwagger.updateLifecycle
  @Roles('admin', 'caregiver', 'customer')
  async updateLifecycleState(
    @Param('event_id', new ParseUUIDPipe({ version: '4' })) event_id: string,
    @Body() body: { lifecycle_state: string; notes?: string },
    @Req() req?: AuthenticatedRequest,
  ) {
    const role = req?.user?.role;
    const actorId = req?.user?.userId;

    const newState = body.lifecycle_state;
    const allowed = Object.values(EventLifecycleEnum) as string[];
    if (!allowed.includes(newState)) {
      throw new BadRequestException(`Invalid lifecycle_state: ${newState}`);
    }

    // Role-based authorization checks
    const event = await this._service.getDetail(event_id);
    if (!event) throw new BadRequestException('Event not found');

    if (role === 'caregiver') {
      if (!actorId) throw new ForbiddenException('Người dùng chưa đăng nhập');
      const ok = await this._acl.caregiverCanAccessPatient(actorId, event.user_id);
      if (!ok) throw new ForbiddenException('Caregiver not assigned to this patient');
    }

    if (role === 'customer') {
      if (!actorId) throw new ForbiddenException('Người dùng chưa đăng nhập');
      if (actorId !== event.user_id)
        throw new ForbiddenException('Customer can only update their own events');
    }

    await this._service.updateLifecycle(event_id, newState as any, actorId, role, body.notes);
    // return full normalized detail
    return this._service.getDetail(event_id);
  }

  // ---- DAILY SUMMARY
  @Get('summary/daily/:userId')
  @ReportAccess()
  @ApiOperation({
    summary: 'Tóm tắt sự kiện trong ngày',
    description: 'Hiển thị số lượng sự kiện theo loại trong ngày hiện tại',
  })
  @ApiResponse({ status: 200, description: 'Daily event summary' })
  async getDailyEventSummary(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const tempRequesterId = req?.user?.userId ?? req?.user?.sub;
    const role = req?.user?.role;

    if (!tempRequesterId) throw new ForbiddenException('Người dùng chưa đăng nhập');

    const requesterId = tempRequesterId as string;
    const hasAccess = await this._acl.checkAccess(requesterId, userId, role as string);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return this._service.getDailyEventSummary(userId);
  }

  // ---- INSIGHTS
  @Get('summary/insights/:userId')
  @ReportAccess()
  @ApiOperation({
    summary: 'Insights về sự kiện',
    description: 'Cung cấp insights có thể hành động từ dữ liệu sự kiện',
  })
  @ApiResponse({ status: 200, description: 'Event insights and recommendations' })
  async getEventInsights(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const tempRequesterId = req?.user?.userId ?? req?.user?.sub;
    const role = req?.user?.role;

    if (!tempRequesterId) throw new ForbiddenException('Người dùng chưa đăng nhập');

    const requesterId = tempRequesterId as string;
    const hasAccess = await this._acl.checkAccess(requesterId, userId, role as string);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return this._service.getEventInsights(userId);
  }

  // ===== EMERGENCY VOICE ENDPOINTS =====

  // POST /events/alarm
  @EventsSwagger.alarm
  @Post('alarm')
  @UseInterceptors(FilesInterceptor('image_files', 4))
  @LogActivity({
    action: 'alarm_triggered',
    action_enum: ActivityAction.CREATE,
    message:
      'Người dùng kích hoạt nút báo động (alarm). Tạo snapshot và/hoặc event, set lifecycle ALARM_ACTIVATED',
    resource_type: 'event',
    severity: ActivitySeverity.HIGH,
  })
  async alarmTrigger(
    @Body() body: AlarmTriggerDto,
    @UploadedFiles() files?: any[],
    @Req() req?: AuthenticatedRequest,
  ) {
    // Mô tả hàm (tiếng Việt):
    // - Endpoint này xử lý hai luồng chính:
    //   1) Nếu client gửi `event_id`: tạo một snapshot (nếu có file), đính kèm snapshot vào event hiện tại,
    //      và chuyển lifecycle của event sang ALARM_ACTIVATED. Đây là trường hợp cảnh báo liên quan tới
    //      event đã tồn tại (ví dụ alarm trigger trong event đang theo dõi).
    //   2) Nếu không có `event_id`: yêu cầu `camera_id` và `user_id` (hoặc caller là customer),
    //      tạo snapshot mới, tạo event mới tham chiếu snapshot đó, gắn marker
    //      `context_data.trigger = 'alarm'` để phân biệt nguồn event, set lifecycle ALARM_ACTIVATED,
    //      và gọi notification worker.
    // Ghi chú kỹ thuật:
    // - Marker `trigger: 'alarm'` được lưu trong trường `context_data` (hoặc `metadata` tùy luồng).
    //   Repository sẽ map `(context_data ?? metadata)` vào cột `context_data` trong DB, do đó
    //   việc thêm marker vào `metadata` ở luồng khác (ví dụ notify) cũng sẽ được lưu.
    // - Chúng ta giữ nguyên `metadata` nếu client truyền kèm, nhưng luôn bổ sung `trigger` để dễ phân
    //   loại origin của event ở tầng sau.
    const role = req?.user?.role;
    const actorId = req?.user?.userId;

    if (!this._snapshotsService || !this._eventDetections) {
      throw new BadRequestException(
        'Server not configured to handle snapshots or event detections',
      );
    }

    // If event_id provided -> attach snapshot to existing event and set lifecycle
    const event_id: string | undefined = body?.event_id;
    const camera_id: string | undefined = body?.camera_id;
    const notes: string | undefined = body?.notes;
    const event_type: EventTypeEnum =
      (body?.event_type as EventTypeEnum) || (EventTypeEnum.emergency as any);
    const status: EventStatusEnum =
      (body?.status as EventStatusEnum) || (EventStatusEnum.danger as any);
    const metadata = body?.metadata ?? { source: 'alarm_button', actor: actorId };

    if (event_id) {
      // Load event and authorize
      const event = await this._service.getDetail(event_id);
      if (!event) throw new BadRequestException('Event not found');

      if (role === 'caregiver') {
        if (!actorId) throw new ForbiddenException('Người dùng chưa đăng nhập');
        const ok = await this._acl.caregiverCanAccessPatient(actorId, event.user_id);
        if (!ok) throw new ForbiddenException('Caregiver not assigned to this patient');
      }
      if (role === 'customer') {
        if (!actorId) {
          throw new ForbiddenException('Người dùng chưa đăng nhập');
        }
        if (actorId !== event.user_id) {
          throw new ForbiddenException('Customer can only update their own events');
        }
      }

      // Create snapshot record (capture_type = alert_triggered) with any provided files
      const snapPayload: any = {
        camera_id: camera_id || event.camera_id,
        user_id: event.user_id,
        metadata,
        capture_type: 'alert_triggered',
        processed_at: new Date(),
      };

      const snapshot = await this._snapshotsService.createWithImages(snapPayload, files);

      // Attach snapshot to event — if attaching fails, clean up the created snapshot to avoid orphaned cloud files
      try {
        await this._eventDetections.attachSnapshotToEvent(event_id as string, snapshot.snapshot_id);
        if (notes && notes.trim().length > 0) {
          await this._eventDetections.updatePartial(event_id as string, { notes });
        }
      } catch (err) {
        try {
          await this._snapshotsService.removeSnapshot(snapshot.snapshot_id);
        } catch (cleanupErr) {
          this.logger.warn(
            `[alarmTrigger] Failed to cleanup snapshot ${snapshot.snapshot_id}: ${String(cleanupErr)}`,
          );
        }
        throw err;
      }

      // Set lifecycle to ALARM_ACTIVATED to prevent escalations
      await this._service.updateLifecycle(
        event_id as string,
        EventLifecycleEnum.ALARM_ACTIVATED,
        actorId,
        role,
        body?.notes,
      );

      const updated = await this._service.getDetail(event_id);
      // extract cloud urls from snapshot files and add local timestamps
      const urls = (((snapshot as any).files || []) as any[])
        .map((f: any) => f.cloud_url)
        .filter(Boolean);
      this.logger.log(
        `[alarmTrigger] Attached snapshot ${snapshot.snapshot_id} to event ${event_id}: ${urls.join(', ')}`,
      );
      const snapshotWithLocal: any = { ...snapshot };
      if (snapshot.captured_at) {
        snapshotWithLocal.captured_at_local = timeUtils.toTimezoneIsoString(snapshot.captured_at);
      }
      if (snapshot.processed_at) {
        snapshotWithLocal.processed_at_local = timeUtils.toTimezoneIsoString(snapshot.processed_at);
      }
      if (urls && urls.length > 0) {
        snapshotWithLocal.uploaded_urls = urls;
      }
      return { event: updated, snapshot: snapshotWithLocal };
    }

    // Otherwise create a new snapshot (with images if provided) and create an event referencing it
    if (!camera_id) {
      throw new BadRequestException('camera_id is required when creating a new event');
    }

    // Determine user_id for new event: prefer provided, else use customer actor if role=customer
    let user_id = body?.user_id;
    if (!user_id) {
      if (role === 'customer' && actorId) {
        user_id = actorId;
      } else {
        throw new BadRequestException(
          'user_id is required when creating a new event (unless you are the customer)',
        );
      }
    }

    const snap = await this._snapshotsService.createWithImages(
      {
        camera_id,
        user_id,
        metadata,
        capture_type: 'alert_triggered',
        processed_at: new Date(),
      },
      files,
    );

    // Create event referencing snapshot. If event creation fails, remove the snapshot to avoid orphaned images.
    const eventPayload: Partial<EventDetection> = {
      user_id,
      camera_id,
      snapshot_id: snap.snapshot_id,
      event_type: event_type as unknown as any,
      notes: notes ?? undefined,
      status: status as unknown as any,
      detected_at: body?.detected_at ? new Date(body.detected_at) : new Date(),
      context_data: { ...(metadata ?? {}), trigger: 'alarm' },
    };

    let createdEvent: any;
    try {
      createdEvent = await this._eventDetections.createEvent(eventPayload);
    } catch (err) {
      // attempt cleanup of snapshot (files + DB record)
      try {
        await this._snapshotsService.removeSnapshot(snap.snapshot_id);
      } catch (cleanupErr) {
        this.logger.warn(
          `[alarmTrigger] Failed to cleanup snapshot after createEvent error for ${snap.snapshot_id}: ${String(cleanupErr)}`,
        );
      }
      throw err;
    }

    // Set lifecycle to ALARM_ACTIVATED
    try {
      await this._service.updateLifecycle(
        createdEvent.event_id as string,
        EventLifecycleEnum.ALARM_ACTIVATED,
        actorId,
        role,
        body?.notes,
      );
    } catch (err) {
      // non-fatal
      this.logger.warn(
        `[alarmTrigger] Failed to set lifecycle for ${createdEvent.event_id}: ${String(err)}`,
      );
    }

    // Notify about new event (FCM)
    try {
      await this._service.notifyNewEvent(createdEvent.event_id as string);
    } catch (err) {
      this.logger.warn(`[alarmTrigger] notifyNewEvent failed: ${String(err)}`);
    }

    const snapUrls = (((snap as any).files || []) as any[])
      .map((f: any) => f.cloud_url)
      .filter(Boolean);
    this.logger.log(
      `[alarmTrigger] Created event ${createdEvent.event_id} with snapshot ${snap.snapshot_id}: ${snapUrls.join(', ')}`,
    );
    const snapWithLocal: any = { ...snap };
    if (snap.captured_at) {
      snapWithLocal.captured_at_local = timeUtils.toTimezoneIsoString(snap.captured_at);
    }
    if (snap.processed_at) {
      snapWithLocal.processed_at_local = timeUtils.toTimezoneIsoString(snap.processed_at);
    }
    if (snapUrls && snapUrls.length > 0) {
      snapWithLocal.uploaded_urls = snapUrls;
    }
    return { event: createdEvent, snapshot: snapWithLocal };
  }

  @Post('voice-callback/confirm-call')
  @ApiOperation({ summary: 'Callback Twilio: Xác nhận cuộc gọi bằng phím số 2' })
  async confirmEmergencyCall(@Body() body: any): Promise<string> {
    // Simple implementation for emergency voice confirmation
    const { Digits, To } = body ?? {};

    if (Digits === '2' && To) {
      return `<Response>
  <Say voice="Google.vi-VN-Wavenet-B" language="vi-VN">
    Đã xác nhận thành công. Không gọi lại trong 30 phút tới. Xin cảm ơn.
  </Say>
</Response>`;
    }

    return `<Response>
  <Say voice="Google.vi-VN-Wavenet-B" language="vi-VN">
    Không xác nhận được. Vui lòng thử lại sau.
  </Say>
</Response>`;
  }
}
