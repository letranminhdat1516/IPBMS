import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import {
  AuditService,
  CreateAuditEventDto,
  AuditEventSummary,
} from '../../../application/services/audit.service';
import { ActivityLog } from '../../../core/entities/activity_logs.entity';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { AuthenticatedRequest } from '../../../shared/types/auth.types';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@ApiTags('audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly _auditService: AuditService) {}

  @Post('events')
  @ApiOperation({ summary: 'Create a new audit event' })
  @ApiResponse({
    status: 201,
    description: 'Audit event created successfully',
    type: ActivityLog,
  })
  async createEvent(
    @Body() dto: CreateAuditEventDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ActivityLog> {
    // Auto-populate actor info from JWT token if not provided
    const auditDto: CreateAuditEventDto = {
      ...dto,
      actor_id: dto.actor_id || getUserIdFromReq(req),
      actor_name: dto.actor_name || getUserIdFromReq(req),
    };

    return this._auditService.createEvent(auditDto);
  }

  @Get('users/:userId/events')
  @ApiOperation({ summary: 'Get audit events for a specific user' })
  @ApiResponse({
    status: 200,
    description: 'User audit events retrieved successfully',
    type: [ActivityLog],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserEvents(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: number,
  ): Promise<ActivityLog[]> {
    // Check if user can access this data (admin or own data)
    const requestingUserId = getUserIdFromReq(req);
    const userRole = req.user?.role;

    if (userRole !== 'admin' && requestingUserId !== userId) {
      throw new Error("Unauthorized to access this user's audit events");
    }

    return this._auditService.getUserEvents(userId, limit ? parseInt(limit.toString()) : 50);
  }

  @Get('users/:userId/summary')
  @ApiOperation({ summary: 'Get audit summary for a specific user' })
  @ApiResponse({
    status: 200,
    description: 'User audit summary retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total_events: { type: 'number' },
        events_by_action: { type: 'object' },
        events_by_resource_type: { type: 'object' },
        recent_events: { type: 'array', items: { $ref: '#/components/schemas/ActivityLog' } },
      },
    },
  })
  async getUserSummary(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<AuditEventSummary> {
    // Check if user can access this data (admin or own data)
    const requestingUserId = getUserIdFromReq(req);
    const userRole = req.user?.role;

    if (userRole !== 'admin' && requestingUserId !== userId) {
      throw new Error("Unauthorized to access this user's audit summary");
    }

    return this._auditService.getUserSummary(userId);
  }

  @Get('events')
  @Roles('admin')
  @ApiOperation({ summary: 'Get all audit events (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'All audit events retrieved successfully',
    type: [ActivityLog],
  })
  async getAllEvents(@Query('limit') limit?: number): Promise<ActivityLog[]> {
    return this._auditService.getAllEvents(limit ? parseInt(limit.toString()) : 100);
  }

  @Get('events/action/:action')
  @Roles('admin')
  @ApiOperation({ summary: 'Get audit events by action type (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Audit events by action retrieved successfully',
    type: [ActivityLog],
  })
  async getEventsByAction(
    @Param('action') action: string,
    @Query('limit') limit?: number,
  ): Promise<ActivityLog[]> {
    return this._auditService.getEventsByAction(action, limit ? parseInt(limit.toString()) : 50);
  }

  @Get('events/resource/:resourceType')
  @Roles('admin')
  @ApiOperation({ summary: 'Get audit events by resource type (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Audit events by resource type retrieved successfully',
    type: [ActivityLog],
  })
  async getEventsByResourceType(
    @Param('resourceType') resourceType: string,
    @Query('limit') limit?: number,
  ): Promise<ActivityLog[]> {
    return this._auditService.getEventsByResourceType(
      resourceType,
      limit ? parseInt(limit.toString()) : 50,
    );
  }
}
