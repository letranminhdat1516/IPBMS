import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRoomAssignment } from '../../../core/entities/user_room_assignments.entity';
import { UserRoomAssignmentsRepository } from '../../../infrastructure/repositories/users/user-room-assignments.repository';

@Injectable()
export class UserRoomAssignmentsService {
  constructor(private readonly repo: UserRoomAssignmentsRepository) {}

  async findById(assignment_id: string): Promise<UserRoomAssignment> {
    const assignment = await this.repo.findAssignmentById(assignment_id);
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  findAll(): Promise<UserRoomAssignment[]> {
    return this.repo.findAll();
  }

  async create(data: Partial<UserRoomAssignment>): Promise<UserRoomAssignment> {
    return this.repo.create(data);
  }

  async update(
    assignment_id: string,
    data: Partial<UserRoomAssignment>,
  ): Promise<UserRoomAssignment> {
    const updated = await this.repo.update(assignment_id, data);
    if (!updated) throw new NotFoundException('Assignment not found');
    return updated;
  }

  async remove(assignment_id: string) {
    return this.repo.remove(assignment_id);
  }
}
