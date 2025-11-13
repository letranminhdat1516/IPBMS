import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Put,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { ThreadMemoryService } from '../../../application/services/thread-memory.service';
import { CreateThreadMemoryDto } from '../../../application/dto/thread-memory/create-thread-memory.dto';
import { UpdateThreadMemoryDto } from '../../../application/dto/thread-memory/update-thread-memory.dto';
import { ThreadMemorySwagger } from '../../../swagger/thread-memory.swagger';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@ApiTags('thread-memory')
@Controller('thread-memory')
export class ThreadMemoryController {
  constructor(private readonly service: ThreadMemoryService) {}

  @Post()
  @ThreadMemorySwagger.create
  @LogActivity({
    action: 'create_thread_memory',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo thread memory',
    resource_type: 'thread_memory',
    resource_name: 'thread_memory',
    severity: ActivitySeverity.LOW,
  })
  async create(@Body() data: CreateThreadMemoryDto) {
    await this.service.create(data);
    return { message: 'Thread memory created successfully' };
  }

  @Put(':id')
  @ThreadMemorySwagger.update
  @LogActivity({
    action: 'update_thread_memory',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật thread memory',
    resource_type: 'thread_memory',
    resource_name: 'thread_memory',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() data: UpdateThreadMemoryDto,
  ) {
    await this.service.update(id, data);
    return { message: 'Thread memory updated successfully' };
  }

  @Delete(':id')
  @ThreadMemorySwagger.delete
  @LogActivity({
    action: 'delete_thread_memory',
    action_enum: ActivityAction.DELETE,
    message: 'Xoá thread memory',
    resource_type: 'thread_memory',
    resource_name: 'thread_memory',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.service.remove(id);
    return { message: 'Thread memory deleted successfully' };
  }
}
