import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AssignCaregiverDto } from '../../../application/dto/caregiver/assign-caregiver.dto';
import { CreateCaregiverDto } from '../../../application/dto/caregiver/create-caregiver.dto';
import { UpdateCaregiverDto } from '../../../application/dto/caregiver/update-caregiver.dto';
import {
  CaregiversService,
  CaregiverInvitationsService,
} from '../../../application/services/users';
import type { PaginateOptions } from '../../../core/types/paginate.types';
import { Paginate } from '../../../shared/decorators/paginate.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { CaregiversSwagger } from '../../../swagger/caregivers.swagger';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';

@ApiTags('caregivers')
@Controller('caregivers')
export class CaregiversController {
  constructor(
    private readonly service: CaregiversService,
    private readonly invitationsService: CaregiverInvitationsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @CaregiversSwagger.getAll
  findAll(@Paginate() query?: PaginateOptions & { status?: string }) {
    if (query && (query.page || query.limit || query.order || query.where)) {
      const where = {
        ...(query.where || {}),
        ...(query.status ? { is_active: query.status === 'approved' ? true : undefined } : {}),
      };
      return this.service.paginateDynamic({ ...query, where });
    }
    return this.service.findAll();
  }

  @Get('invitations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @ApiQuery({ name: 'caregiver_id', required: false, description: 'Filter by caregiver UUID' })
  @ApiQuery({ name: 'customer_id', required: false, description: 'Filter by customer UUID' })
  async listInvitations(
    @Query('caregiver_id') caregiver_id?: string,
    @Query('customer_id') customer_id?: string,
  ) {
    return this.invitationsService.list(caregiver_id, customer_id);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @CaregiversSwagger.search
  @ApiQuery({
    name: 'keyword',
    required: false,
    description: 'Search keyword (username, fullname, email)',
  })
  @ApiQuery({
    name: 'hide_assigned',
    required: false,
    description: 'If true, exclude caregivers already assigned',
  })
  async search(
    @Query('keyword') keyword: string = '',
    @Paginate() query?: PaginateOptions,
    @Query('hide_assigned') hide_assigned?: string,
  ) {
    const res = await this.service.paginateWithSearch(
      keyword,
      query?.page,
      query?.limit,
      (query?.order as Record<string, 'ASC' | 'DESC'>) ?? { created_at: 'DESC' },
    );

    if (hide_assigned && String(hide_assigned).toLowerCase() === 'true') {
      const filtered = (res.data || []).filter((d: any) => d.assignment_status !== 'assigned');
      return { ...res, data: filtered, total: filtered.length };
    }

    return res;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @CaregiversSwagger.getById
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @CaregiversSwagger.create
  @LogActivity({
    action: 'create_caregiver',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo caregiver mới',
    resource_type: 'caregiver',
    resource_name: 'caregiver',
    resource_id: '@result.id',
    severity: ActivitySeverity.INFO,
  })
  create(@Body() dto: CreateCaregiverDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @CaregiversSwagger.update
  @LogActivity({
    action: 'update_caregiver',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật caregiver',
    resource_type: 'caregiver',
    resource_name: 'caregiver',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  update(@Param('id') id: string, @Body() body: UpdateCaregiverDto) {
    return this.service.update(id, body);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @LogActivity({
    action: 'update_caregiver_status',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật trạng thái caregiver',
    resource_type: 'caregiver',
    resource_name: 'caregiver',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  updateStatus(@Param('id') id: string, @Body() body: { status: 'approved' | 'rejected' }) {
    const is_active = body.status === 'approved';
    return this.service.update(id, { is_active });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @CaregiversSwagger.delete
  @LogActivity({
    action: 'delete_caregiver',
    action_enum: ActivityAction.DELETE,
    message: 'Xóa caregiver',
    resource_type: 'caregiver',
    resource_name: 'caregiver',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Delete(':id/soft')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @CaregiversSwagger.delete
  @LogActivity({
    action: 'soft_delete_caregiver',
    action_enum: ActivityAction.DELETE,
    message: 'Xóa mềm caregiver',
    resource_type: 'caregiver',
    resource_name: 'caregiver',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  softDelete(@Param('id') id: string) {
    return this.service.softDelete(id);
  }

  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard)
  @Roles('customer', 'admin')
  @ApiBody({ type: AssignCaregiverDto })
  @LogActivity({
    action: 'assign_caregiver',
    action_enum: ActivityAction.ASSIGN,
    message: 'Gán caregiver cho user',
    resource_type: 'caregiver',
    resource_name: 'caregiver_assignment',
    resource_id: 'id',
    severity: ActivitySeverity.INFO,
  })
  assignCaregiver(@Param('id') caregiverId: string, @Body() body: AssignCaregiverDto) {
    return this.service.assignCaregiverToUser(caregiverId, body.user_id);
  }
}
