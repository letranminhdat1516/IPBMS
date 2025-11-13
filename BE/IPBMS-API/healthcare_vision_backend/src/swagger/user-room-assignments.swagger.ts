import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UserRoomAssignment } from '../core/entities/user_room_assignments.entity';
import { CreateUserRoomAssignmentDto } from '../application/dto/user-room-assignments/create-user-room-assignment.dto';
import { UpdateUserRoomAssignmentDto } from '../application/dto/user-room-assignments/update-user-room-assignment.dto';

export const UserRoomAssignmentsSwagger = {
  findAll: applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách tất cả user-room assignments' }),
    ApiOkResponse({ type: [UserRoomAssignment] }),
  ),

  findById: applyDecorators(
    ApiOperation({ summary: 'Lấy thông tin assignment theo ID' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiOkResponse({ type: UserRoomAssignment }),
  ),

  create: applyDecorators(
    ApiOperation({ summary: 'Tạo mới user-room assignment' }),
    ApiBody({ type: CreateUserRoomAssignmentDto }),
    ApiCreatedResponse({ description: 'Assignment được tạo thành công' }),
  ),

  update: applyDecorators(
    ApiOperation({ summary: 'Cập nhật assignment theo ID' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiBody({ type: UpdateUserRoomAssignmentDto }),
    ApiOkResponse({ description: 'Assignment được cập nhật thành công' }),
  ),

  remove: applyDecorators(
    ApiOperation({ summary: 'Xoá assignment theo ID' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiNoContentResponse({ description: 'Assignment được xoá thành công' }),
  ),
};
