import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { HistoryService } from '../../../modules/tickets/history.service';
import { TicketsService } from '../../../application/services/tickets.service';
import { TicketHistory } from '../../../shared/types/ticket-history';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { parseExpandLimit, DEFAULT_EXPAND_LIMIT } from '../../../shared/utils/expand-limit.util';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';
import { AuthenticatedRequest } from '../../../shared/types/auth.types';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('ticket-history')
@Controller('tickets/:ticketId/history')
export class HistoryController {
  constructor(
    private readonly _historyService: HistoryService,
    private readonly _ticketsService: TicketsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy lịch sử ticket (mỗi bản ghi mở rộng với change_count và changes[])',
  })
  @ApiQuery({
    name: 'expand_limit',
    required: false,
    schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
    description:
      'Số phần tử trong `changes` trả về cho mỗi history entry. Default 20, Max 100. Giá trị >100 sẽ được clamp về 100; giá trị <=0 hoặc không phải integer → 400.',
  })
  @Roles('customer', 'caregiver', 'admin')
  async findByTicket(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Req() req: AuthenticatedRequest,
    @Query('expand_limit') expand_limit?: string,
  ): Promise<TicketHistory[] | any> {
    const ticket = await this._ticketsService.findById(ticketId);
    const userId = getUserIdFromReq(req);
    if (req.user?.role !== 'admin' && ticket.user_id !== userId) {
      throw new ForbiddenException('Bạn không được phép truy cập lịch sử ticket này');
    }
    const rows = await this._historyService.findByTicket(ticketId);
    const limParsed = parseExpandLimit(expand_limit);
    if (Number.isNaN(limParsed))
      throw new BadRequestException('expand_limit phải là một số nguyên dương');
    const lim = limParsed === undefined ? DEFAULT_EXPAND_LIMIT : limParsed;
    return rows.map((r) => this._historyService.expandHistoryRow(r as any, { limit: lim }));
  }

  @Get('timeline')
  @ApiQuery({
    name: 'expand_limit',
    required: false,
    schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
    description:
      'Số phần tử trong `changes` trả về cho mỗi history entry khi mở rộng. Mặc định 20, tối đa 100. Giá trị >100 sẽ bị clamp về 100. Giá trị <=0 hoặc không phải integer sẽ trả HTTP 400.',
  })
  @Roles('customer', 'caregiver', 'admin')
  async getTicketTimeline(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Req() req: AuthenticatedRequest,
    @Query('expand_limit') expand_limit?: string,
  ): Promise<TicketHistory[] | any> {
    const ticket = await this._ticketsService.findById(ticketId);
    const userId = getUserIdFromReq(req);
    if (req.user?.role !== 'admin' && ticket.user_id !== userId) {
      throw new ForbiddenException('Bạn không được phép truy cập lịch sử ticket này');
    }

    const rows = await this._historyService.getTicketTimeline(ticketId);

    // Default behavior: expand each row to include a `changes` array and `change_count`.
    // Use expand_limit (if provided) to cap number of per-field entries returned.
    const limParsed = parseExpandLimit(expand_limit);
    if (Number.isNaN(limParsed))
      throw new BadRequestException('expand_limit phải là một số nguyên dương');
    const lim = limParsed === undefined ? DEFAULT_EXPAND_LIMIT : limParsed;
    return rows.map((r) => this._historyService.expandHistoryRow(r as any, { limit: lim }));
  }

  @Get(':id')
  @Roles('customer', 'caregiver', 'admin')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TicketHistory> {
    return this._historyService.findOne(id);
  }
}

// Admin-only controller for system-wide history
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('admin-history')
@Controller('admin/history')
export class AdminHistoryController {
  constructor(private readonly _historyService: HistoryService) {}

  @Get('recent')
  @Roles('admin')
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  async getRecentActivity(@Query('limit') limit?: number): Promise<TicketHistory[]> {
    return this._historyService.getRecentActivity(limit);
  }

  @Get('user/:userId')
  @Roles('admin')
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  async getUserActivity(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit') limit?: number,
  ): Promise<TicketHistory[]> {
    return this._historyService.getUserActivity(userId, limit);
  }
}
