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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { AiConfigurationsService } from '../../../application/services/ai';
import { AiConfiguration } from '../../../core/entities/ai_configurations.entity';
import { CreateAiConfigurationDto } from '../../../application/dto/ai-configurations/create-ai-configuration.dto';
import { UpdateAiConfigurationDto } from '../../../application/dto/ai-configurations/update-ai-configuration.dto';
import { AiConfigurationsSwagger } from '../../../swagger/ai-configurations.swagger';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivitySeverity, ActivityAction } from '../../../core/entities/activity_logs.entity';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';
import { AuthenticatedRequest } from '../../../shared/types/auth.types';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@ApiTags('ai-configurations')
@Controller('ai-configurations')
export class AiConfigurationsController {
  constructor(private readonly service: AiConfigurationsService) {}

  @Get()
  @AiConfigurationsSwagger.list
  async findAll(): Promise<AiConfiguration[]> {
    return this.service.findAll();
  }

  @Get(':id')
  @AiConfigurationsSwagger.getById
  async findById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<AiConfiguration> {
    return this.service.findById(id);
  }

  @Post()
  @AiConfigurationsSwagger.create
  @LogActivity({
    action: 'create_ai_configuration',
    action_enum: ActivityAction.CREATE ?? ActivityAction.UPDATE,
    message: 'Tạo mới AI configuration',
    resource_type: 'ai_configuration',
    resource_name: 'ai_configuration',
    resource_id: '@result.id',
    severity: ActivitySeverity.INFO,
  })
  async create(@Body() data: CreateAiConfigurationDto, @Req() req: AuthenticatedRequest) {
    const userId = getUserIdFromReq(req);
    return this.service.create({ ...data, created_by: userId });
  }

  @Put(':id')
  @AiConfigurationsSwagger.update
  @LogActivity({
    action: 'update_ai_configuration',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật AI configuration',
    resource_type: 'ai_configuration',
    resource_name: 'ai_configuration',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() data: UpdateAiConfigurationDto,
  ) {
    await this.service.update(id, data);
    return { message: 'AI configuration updated successfully' };
  }

  @Delete(':id')
  @AiConfigurationsSwagger.delete
  @LogActivity({
    action: 'delete_ai_configuration',
    action_enum: ActivityAction.DELETE ?? ActivityAction.UPDATE,
    message: 'Xóa AI configuration',
    resource_type: 'ai_configuration',
    resource_name: 'ai_configuration',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.service.remove(id);
    return { message: 'AI configuration deleted successfully' };
  }
}
