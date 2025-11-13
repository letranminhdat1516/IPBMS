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
import { AiProcessingLogsService } from '../../../application/services/ai';
import { events } from '@prisma/client';
import { CreateAiProcessingLogDto } from '../../../application/dto/ai-processing-logs/create-ai-processing-log.dto';
import { UpdateAiProcessingLogDto } from '../../../application/dto/ai-processing-logs/update-ai-processing-log.dto';
import { AiProcessingLogsSwagger } from '../../../swagger/ai-processing-logs.swagger';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivitySeverity, ActivityAction } from '../../../core/entities/activity_logs.entity';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@ApiTags('ai-processing-logs')
@Controller('ai-processing-logs')
export class AiProcessingLogsController {
  constructor(private readonly service: AiProcessingLogsService) {}

  @Get()
  @AiProcessingLogsSwagger.list
  async findAll(): Promise<events[]> {
    return this.service.findAll();
  }

  @Get(':id')
  @AiProcessingLogsSwagger.getById
  async findById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<events> {
    return this.service.findById(id);
  }

  @Post()
  @AiProcessingLogsSwagger.create
  @LogActivity({
    action: 'create_ai_processing_log',
    action_enum: ActivityAction.CREATE ?? ActivityAction.UPDATE,
    message: 'Tạo mới AI processing log',
    resource_type: 'ai_processing_log',
    resource_name: 'ai_processing_log',
    resource_id: '@result.id',
    severity: ActivitySeverity.INFO,
  })
  async create(@Body() data: CreateAiProcessingLogDto) {
    return this.service.create(data);
  }

  @Put(':id')
  @AiProcessingLogsSwagger.update
  @LogActivity({
    action: 'update_ai_processing_log',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật AI processing log',
    resource_type: 'ai_processing_log',
    resource_name: 'ai_processing_log',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() data: UpdateAiProcessingLogDto,
  ) {
    await this.service.update(id, data);
    return { message: 'AI processing log updated successfully' };
  }

  @Delete(':id')
  @AiProcessingLogsSwagger.delete
  @LogActivity({
    action: 'delete_ai_processing_log',
    action_enum: ActivityAction.DELETE ?? ActivityAction.UPDATE,
    message: 'Xóa AI processing log',
    resource_type: 'ai_processing_log',
    resource_name: 'ai_processing_log',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.service.remove(id);
    return { message: 'AI processing log deleted successfully' };
  }
}
