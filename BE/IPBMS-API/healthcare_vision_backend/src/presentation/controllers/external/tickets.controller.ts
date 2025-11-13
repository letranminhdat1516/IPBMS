import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  Logger,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateTicketDto } from '../../../application/dto/tickets/create-ticket.dto';
import { UpdateTicketDto } from '../../../application/dto/tickets/update-ticket.dto';
import { TicketsService } from '../../../application/services/tickets.service';
import { UploadsService } from '../../../application/services/upload/uploads.service';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { HistoryService } from '../../../modules/tickets/history.service';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { AttachmentResolveInterceptor } from '../../../shared/interceptors/attachment-resolve.interceptor';
import { Ticket } from '../../../shared/types/ticket';
import { TicketsSwagger } from '../../../swagger/tickets.swagger';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  private readonly logger = new Logger(TicketsController.name);
  constructor(
    private readonly _svc: TicketsService,
    private readonly _historyService: HistoryService,
    private readonly _uploadsService: UploadsService,
  ) {}

  // Expose metadata for frontend: statuses, categories, transitions
  @Get('meta')
  @Roles('admin', 'caregiver', 'customer')
  @TicketsSwagger.meta
  async meta(@Req() _req: any): Promise<any> {
    // small authorization: all authenticated users can read meta
    const statuses = [
      'new',
      'open',
      'in_progress',
      'waiting_for_customer',
      'waiting_for_agent',
      'resolved',
      'closed',
    ];

    const categories = ['technical', 'billing', 'general'];

    // transitions: allowed to => list
    const transitions: Record<string, string[]> = {
      new: ['open', 'in_progress', 'closed'],
      open: ['in_progress', 'waiting_for_customer', 'resolved', 'closed'],
      in_progress: ['waiting_for_customer', 'waiting_for_agent', 'resolved', 'closed'],
      waiting_for_customer: ['in_progress', 'closed'],
      waiting_for_agent: ['in_progress', 'resolved', 'closed'],
      resolved: ['closed', 'reopened'],
      closed: ['reopened'],
    } as any;

    return { statuses, categories, transitions };
  }

  private isAdmin(role?: string) {
    return role === 'admin';
  }

  @Delete(':id')
  @Roles('admin')
  @TicketsSwagger.remove
  @ApiResponse({
    status: 204,
    description: 'Ticket deleted successfully (no content)',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions or deletion failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - ticket does not exist',
  })
  @LogActivity({
    action: 'delete_ticket',
    action_enum: ActivityAction.DELETE,
    message: 'Xóa support_tickets',
    resource_type: 'support_tickets',
    resource_name: 'support_tickets',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    // Let service throw NotFoundException if not found or other errors propagate
    await this._svc.remove(id);
    return;
  }

  @Get()
  @Roles('customer', 'caregiver', 'admin')
  @TicketsSwagger.list
  @ApiOperation({
    summary: 'Lấy danh sách ticket',
    description:
      'Trả về danh sách ticket. Admin có thể sử dụng tham số phân trang; non-admin chỉ nhìn thấy ticket của chính họ. Hỗ trợ query `page` và `page_size` cho admin.',
  })
  @ApiResponse({ status: 200, description: 'Array of tickets' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Chỉ dùng cho admin' })
  @ApiQuery({ name: 'page_size', required: false, example: 20, description: 'Chỉ dùng cho admin' })
  async list(
    @Req() req: any,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('page_size', new ParseIntPipe({ optional: true })) page_size?: number,
  ): Promise<Ticket[]> {
    if (this.isAdmin(req.user?.role)) {
      const p = Number.isFinite(page) && page! > 0 ? page! : 1;
      const ps =
        Number.isFinite(page_size) && page_size! > 0 && page_size! <= 100 ? page_size! : 50;
      const offset = (p - 1) * ps;
      return this._svc.findAllPaged(offset, ps);
    }
    return this._svc.findAllByUserId(getUserIdFromReq(req));
  }

  @Post()
  @Roles('customer', 'caregiver', 'admin')
  @TicketsSwagger.create
  @UseInterceptors(AttachmentResolveInterceptor)
  @ApiOperation({
    summary: 'Tạo mới ticket',
    description: 'Tạo ticket sử dụng CreateTicketDto. Yêu cầu người dùng đã xác thực.',
  })
  async create(
    @Body(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        exceptionFactory: (errors: any[]) => {
          // Map class-validator errors to a Vietnamese message array
          const msgs: string[] = [];
          for (const err of errors) {
            const constraints = err.constraints || {};
            const field = err.property;
            for (const k of Object.keys(constraints)) {
              const defaultMsg = String(constraints[k]);
              let viMsg = defaultMsg;
              if (defaultMsg.includes('should not be empty')) {
                viMsg = `${field} không được để trống`;
              } else if (defaultMsg.includes('must be a UUID')) {
                viMsg = `${field} phải là UUID hợp lệ`;
              } else if (defaultMsg.includes('must be a string')) {
                viMsg = `${field} phải là chuỗi`;
              }
              msgs.push(viMsg);
            }
          }
          // Log validation failures
          Logger.warn(`📛 [TICKETS] Validation failed: ${msgs.join('; ')}`);
          return new BadRequestException({
            success: false,
            error: 'Dữ liệu không hợp lệ',
            details: msgs,
          });
        },
      }),
    )
    dto: CreateTicketDto,
    @Req() req: any,
  ) {
    // ensure the user_id matches the authenticated user or admin can create for others
    const callerId = getUserIdFromReq(req);
    if (!this.isAdmin(req.user?.role)) dto.user_id = callerId;

    this.logger.log(
      `📥 [TICKETS] create request user=${callerId} title=${dto.title || '<no-title>'}`,
    );

    const t = await this._svc.create(dto);
    return { message: 'Tạo ticket thành công', ticket_id: (t as any).ticket_id };
  }

  @Put(':id')
  @Roles('admin', 'caregiver', 'customer')
  @TicketsSwagger.update
  @ApiOperation({
    summary: 'Cập nhật ticket theo id',
    description:
      'Cập nhật các trường có thể chỉnh sửa của ticket. Non-admin chỉ được cập nhật ticket của chính họ.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
    @Req() req: any,
  ) {
    const existing = await this._svc.findById(id);
    if (!this.isAdmin(req.user?.role) && existing.user_id !== getUserIdFromReq(req)) {
      throw new ForbiddenException('Bạn không có quyền cập nhật ticket này');
    }
    await this._svc.update(id, dto as any);
    return { message: 'Cập nhật ticket thành công' };
  }

  @Patch(':id/status')
  @Roles('admin', 'caregiver', 'customer')
  @TicketsSwagger.updateStatus
  @ApiOperation({
    summary: 'Cập nhật trạng thái ticket',
    description:
      'Thay đổi trạng thái ticket. Admin/caregiver có thể thay đổi mọi trạng thái. Customer chỉ có thể thay đổi khi ticket ở trạng thái `waiting_for_customer` và chỉ chuyển sang các giá trị được phép (ví dụ `in_progress` hoặc `closed`). Body: { status: string }',
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: string },
    @Req() req: any,
  ) {
    const ticket = await this._svc.findById(id);
    const newStatus = body.status as any;

    // Admins and caregivers can change any status
    if (req.user?.role === 'admin' || req.user?.role === 'caregiver') {
      await this._svc.updateStatus(id, newStatus);
      return { message: 'Cập nhật trạng thái ticket thành công' };
    }

    // Customers: allow only certain transitions when ticket is waiting_for_customer
    // or when ticket is new (owner may start progress themselves)
    if (req.user?.role === 'customer') {
      // allow customers to act when the ticket is explicitly waiting for customer
      // or when it is newly created (owner-initiated escalation)
      if (!['waiting_for_customer', 'new'].includes(ticket.status)) {
        throw new ForbiddenException(
          'Khách hàng chỉ có thể thay đổi trạng thái khi ticket đang chờ phản hồi (waiting_for_customer) hoặc khi ticket mới',
        );
      }
      const allowedForCustomer = ['in_progress', 'closed'];
      if (!allowedForCustomer.includes(newStatus)) {
        throw new ForbiddenException('Yêu cầu thay đổi trạng thái không được phép cho khách hàng');
      }
      await this._svc.updateStatus(id, newStatus);
      return { message: 'Cập nhật trạng thái ticket thành công' };
    }

    throw new ForbiddenException('Bạn không có quyền thay đổi trạng thái ticket');
  }
  // Messages, assignments and ratings are handled by dedicated controllers
  // (`MessageController`, `AssignmentController`, `RatingController`).
  // Keeping those responsibilities separated avoids duplicated logic and
  // ensures a single source of truth for each sub-resource.

  // History endpoints
  // History endpoints are handled by the dedicated HistoryController at
  // tickets/:ticketId/history to avoid duplication and route shadowing.

  @Get(':id')
  @Roles('admin', 'caregiver', 'customer')
  @TicketsSwagger.findById
  /**
   * Get a ticket by its UUID.
   * - Admins may fetch any ticket.
   * - Non-admins may only fetch tickets they own.
   */
  @ApiResponse({
    status: 200,
    description:
      'Thông tin chi tiết ticket. LƯU Ý: Lịch sử thay đổi (history) của ticket được expose qua endpoint `GET /tickets/:ticketId/history` và hỗ trợ mở rộng per-field diffs (`change_count` + `changes[]`) bằng query param `expand_limit` (default=20, max=100).',
  })
  async findById(@Param('id', ParseUUIDPipe) id: string, @Req() req: any): Promise<Ticket> {
    const t = await this._svc.findById(id);
    if (!this.isAdmin(req.user?.role) && t.user_id !== getUserIdFromReq(req)) {
      throw new ForbiddenException('Bạn không có quyền truy cập ticket này');
    }
    return t;
  }
}
