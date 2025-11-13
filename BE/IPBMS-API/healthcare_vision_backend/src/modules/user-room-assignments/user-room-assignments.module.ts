import { Module } from '@nestjs/common';
import { UserRoomAssignmentsRepository } from '../../infrastructure/repositories/users/user-room-assignments.repository';
import { UserRoomAssignmentsService } from '../../application/services/user-room-assignments.service';
import { UserRoomAssignmentsController } from '../../presentation/controllers/users/room-assignments.controller';

@Module({
  imports: [],
  controllers: [UserRoomAssignmentsController],
  providers: [UserRoomAssignmentsRepository, UserRoomAssignmentsService],
  exports: [UserRoomAssignmentsService, UserRoomAssignmentsRepository],
})
export class UserRoomAssignmentsModule {}
