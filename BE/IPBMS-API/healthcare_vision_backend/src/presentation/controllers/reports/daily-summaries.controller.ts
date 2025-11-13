import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { DailySummariesService } from '../../../application/services/daily-summaries.service';
import { DailySummary } from '../../../core/entities/daily_summaries.entity';
import { CreateDailySummaryDto } from '../../../application/dto/daily-summaries/create-daily-summary.dto';
import { UpdateDailySummaryDto } from '../../../application/dto/daily-summaries/update-daily-summary.dto';
import { DailySummariesSwagger } from '../../../swagger/daily-summaries.swagger';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@ApiTags('daily-summaries')
@Controller('daily-summaries')
export class DailySummariesController {
  constructor(private readonly service: DailySummariesService) {}

  @Get()
  @DailySummariesSwagger.list
  async findAll(): Promise<DailySummary[]> {
    return this.service.findAll();
  }

  @Get(':id')
  @DailySummariesSwagger.findById
  async findById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<DailySummary> {
    return this.service.findById(id);
  }

  @Post()
  @DailySummariesSwagger.create
  @LogActivity({
    action: 'create_daily_summary',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo daily summary mới',
    resource_type: 'daily_summary',
    resource_name: 'daily_summary',
    resource_id: '@result.id',
    severity: ActivitySeverity.INFO,
  })
  async create(@Body() data: CreateDailySummaryDto): Promise<{ message: string }> {
    await this.service.create(data);
    return { message: 'Daily summary created successfully' };
  }

  @Put(':id')
  @DailySummariesSwagger.update
  @LogActivity({
    action: 'update_daily_summary',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật daily summary',
    resource_type: 'daily_summary',
    resource_name: 'daily_summary',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() data: UpdateDailySummaryDto,
  ): Promise<{ message: string }> {
    await this.service.update(id, data);
    return { message: 'Daily summary updated successfully' };
  }

  @Delete(':id')
  @DailySummariesSwagger.remove
  @LogActivity({
    action: 'delete_daily_summary',
    action_enum: ActivityAction.DELETE,
    message: 'Xóa daily summary',
    resource_type: 'daily_summary',
    resource_name: 'daily_summary',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<{ message: string }> {
    await this.service.remove(id);
    return { message: 'Daily summary deleted successfully' };
  }
}
