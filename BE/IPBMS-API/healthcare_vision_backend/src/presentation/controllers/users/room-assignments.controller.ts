import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { UserRoomAssignmentsService } from '../../../application/services/users';
import { CreateUserRoomAssignmentDto } from '../../../application/dto/user-room-assignments/create-user-room-assignment.dto';
import { UpdateUserRoomAssignmentDto } from '../../../application/dto/user-room-assignments/update-user-room-assignment.dto';
import { UserRoomAssignment } from '../../../core/entities/user_room_assignments.entity';
import { UserRoomAssignmentsSwagger } from '../../../swagger/user-room-assignments.swagger';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@ApiTags('user-room-assignments')
@Controller('user-room-assignments')
export class UserRoomAssignmentsController {
  constructor(private readonly service: UserRoomAssignmentsService) {}

  @Get()
  @UserRoomAssignmentsSwagger.findAll
  async findAll(): Promise<UserRoomAssignment[]> {
    return this.service.findAll();
  }

  @Get(':id')
  @UserRoomAssignmentsSwagger.findById
  async findById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<UserRoomAssignment> {
    return this.service.findById(id);
  }

  @Post()
  @UserRoomAssignmentsSwagger.create
  @LogActivity({
    action: 'create_user_room_assignment',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo liên kết user-room',
    resource_type: 'user_room_assignment',
    resource_name: 'user_room_assignment',
    severity: ActivitySeverity.LOW,
  })
  async create(@Body() data: CreateUserRoomAssignmentDto) {
    await this.service.create(data);
    return { message: 'User-room assignment created successfully' };
  }

  @Put(':id')
  @UserRoomAssignmentsSwagger.update
  @LogActivity({
    action: 'update_user_room_assignment',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật liên kết user-room',
    resource_type: 'user_room_assignment',
    resource_id: 'id',
    resource_name: 'user_room_assignment',
    severity: ActivitySeverity.MEDIUM,
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() data: UpdateUserRoomAssignmentDto,
  ) {
    await this.service.update(id, data);
    return { message: 'User-room assignment updated successfully' };
  }

  @Delete(':id')
  @UserRoomAssignmentsSwagger.remove
  @LogActivity({
    action: 'delete_user_room_assignment',
    action_enum: ActivityAction.DELETE,
    message: 'Xoá liên kết user-room',
    resource_type: 'user_room_assignment',
    resource_id: 'id',
    resource_name: 'user_room_assignment',
    severity: ActivitySeverity.HIGH,
  })
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.service.remove(id);
    return { message: 'User-room assignment deleted successfully' };
  }
}
