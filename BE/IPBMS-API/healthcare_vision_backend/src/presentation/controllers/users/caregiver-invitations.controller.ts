import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { CreateAssignmentDto } from '../../../application/dto/caregiver-invitations/assignment.dto';
import { CaregiverInvitationsService } from '../../../application/services/users';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { CaregiverInvitationsSwagger } from '../../../swagger/caregiver-invitations.swagger';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivitySeverity, ActivityAction } from '../../../core/entities/activity_logs.entity';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('caregiver-invitations')
@Controller('caregiver-invitations')
export class CaregiverInvitationsController {
  constructor(private readonly svc: CaregiverInvitationsService) {}

  @Get()
  @Roles('customer', 'caregiver', 'admin')
  @CaregiverInvitationsSwagger.list
  @ApiQuery({ name: 'caregiver_id', required: false, description: 'Filter by caregiver UUID' })
  @ApiQuery({ name: 'customer_id', required: false, description: 'Filter by customer UUID' })
  async list(
    @Query('caregiver_id') caregiver_id?: string,
    @Query('customer_id') customer_id?: string,
  ) {
    return this.svc.list(caregiver_id, customer_id);
  }

  @Get('/caregiver/me')
  @Roles('caregiver')
  @CaregiverInvitationsSwagger.getAssignmentsOfCaregiver
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'accepted', 'rejected'] })
  async getAssignmentsOfCaregiver(
    @Req() req: any,
    @Query('status') status?: 'pending' | 'accepted' | 'rejected',
  ) {
    return this.svc.listCustomersOfCaregiver(getUserIdFromReq(req), status);
  }

  @Get('/customer/me')
  @Roles('customer')
  @CaregiverInvitationsSwagger.getAssignmentsOfCustomer
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'accepted', 'rejected'] })
  async getAssignmentsOfCustomer(
    @Req() req: any,
    @Query('status') status?: 'pending' | 'accepted' | 'rejected',
  ) {
    return this.svc.listCaregiversOfCustomer(getUserIdFromReq(req), status);
  }

  @Get('/by-customer/:customer_id')
  @Roles('admin', 'caregiver', 'customer')
  @CaregiverInvitationsSwagger.getAssignmentsByCustomerId
  async listByCustomer(@Param('customer_id', ParseUUIDPipe) customer_id: string) {
    return this.svc.listCaregiversOfCustomer(customer_id);
  }

  @Get('/pending')
  @Roles('caregiver')
  @CaregiverInvitationsSwagger.getPending
  async getPendingAssignments(@Req() req: any) {
    return this.svc.listByStatus(getUserIdFromReq(req), 'pending');
  }

  @Post()
  @Roles('customer')
  @CaregiverInvitationsSwagger.create
  @LogActivity({
    action: 'assign_caregiver',
    action_enum: ActivityAction.ASSIGN,
    message: 'Customer gán caregiver mới',
    resource_type: 'assignment',
    resource_name: 'caregiver_assignment',
    resource_id: 'dto.customer_id',
    severity: ActivitySeverity.INFO,
  })
  async create(@Body() dto: CreateAssignmentDto, @Req() req: any) {
    const assigned_by = getUserIdFromReq(req);
    const customer_id = assigned_by;
    return this.svc.assign(
      dto.caregiver_id,
      customer_id,
      assigned_by,
      dto.assignment_notes ?? undefined,
    );
  }

  @Post(':assignment_id/accept')
  @Roles('caregiver')
  @CaregiverInvitationsSwagger.accept
  @LogActivity({
    action: 'accept_assignment',
    action_enum: ActivityAction.UPDATE,
    message: 'Caregiver chấp nhận assignment',
    resource_type: 'assignment',
    resource_name: 'caregiver_assignment',
    resource_id: 'assignment_id',
    severity: ActivitySeverity.INFO,
  })
  async accept(@Param('assignment_id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.svc.updateStatus(id, 'accepted', getUserIdFromReq(req));
  }

  @Post(':assignment_id/reject')
  @Roles('caregiver')
  @CaregiverInvitationsSwagger.reject
  @LogActivity({
    action: 'reject_assignment',
    action_enum: ActivityAction.UPDATE,
    message: 'Caregiver từ chối assignment',
    resource_type: 'assignment',
    resource_name: 'caregiver_assignment',
    resource_id: 'assignment_id',
    severity: ActivitySeverity.MEDIUM,
  })
  async reject(
    @Param('assignment_id', ParseUUIDPipe) id: string,
    @Body() body: { notes?: string },
    @Req() req: any,
  ) {
    return this.svc.updateStatus(id, 'rejected', getUserIdFromReq(req), body?.notes ?? undefined);
  }

  @Get('stats')
  @Roles('admin', 'caregiver', 'customer')
  @CaregiverInvitationsSwagger.stats
  async getStats(@Query('user_id') user_id?: string) {
    return this.svc.getStats(user_id);
  }

  @Delete(':assignment_id')
  @Roles('customer', 'caregiver')
  @CaregiverInvitationsSwagger.unassignById
  @LogActivity({
    action: 'unassign_caregiver',
    action_enum: ActivityAction.UNASSIGN,
    message: 'Xóa caregiver khỏi customer',
    resource_type: 'assignment',
    resource_name: 'caregiver_assignment',
    resource_id: 'assignment_id',
    severity: ActivitySeverity.HIGH,
  })
  async unassignById(@Param('assignment_id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.svc.unassignById(id, getUserIdFromReq(req), req.user?.role);
  }

  @Delete('/pair')
  @Roles('customer', 'caregiver')
  @CaregiverInvitationsSwagger.unassignByPair
  @LogActivity({
    action: 'unassign_caregiver_pair',
    action_enum: ActivityAction.UNASSIGN,
    message: 'Xóa assignment theo cặp caregiver-customer',
    resource_type: 'assignment',
    resource_name: 'caregiver_assignment',
    resource_id: 'caregiver_id-customer_id',
    severity: ActivitySeverity.HIGH,
  })
  async unassignByPair(
    @Body() body: { caregiver_id: string; customer_id: string },
    @Req() req: any,
  ) {
    return this.svc.unassignByPair(
      body.caregiver_id,
      body.customer_id,
      getUserIdFromReq(req),
      req.user?.role,
    );
  }
}
