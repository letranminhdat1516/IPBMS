import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { UnitOfWork } from '../../../infrastructure/database/unit-of-work.service';
import { BasePrismaRepository } from './base-prisma.repository';

@Injectable()
export class AccessControlRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async isCaregiverAssignedToPatient(caregiverId: string, patientId: string): Promise<boolean> {
    const assignment = await this.prisma.caregiver_invitations.findFirst({
      where: {
        caregiver_id: caregiverId,
        customer_id: patientId,
        is_active: true,
      },
    });
    return !!assignment;
  }

  async isCaregiverExplicitlyAssigned(caregiverId: string, patientId: string): Promise<boolean> {
    const assignment = await this.prisma.caregiver_invitations.findFirst({
      where: {
        caregiver_id: caregiverId,
        customer_id: patientId,
        is_active: true,
      },
    });
    return !!assignment;
  }

  async isCaregiverAssignedToPatientByRoom(
    caregiverId: string,
    patientId: string,
  ): Promise<boolean> {
    // Check if caregiver and patient are in the same room via user_room_assignments
    const caregiverRooms = await this.prisma.user_preferences.findMany({
      where: {
        user_id: caregiverId,
        category: 'user_room_assignments',
      },
    });

    const patientRooms = await this.prisma.user_preferences.findMany({
      where: {
        user_id: patientId,
        category: 'user_room_assignments',
      },
    });

    const caregiverRoomIds = caregiverRooms.map((r) => JSON.parse(r.setting_value).room_id);
    const patientRoomIds = patientRooms.map((r) => JSON.parse(r.setting_value).room_id);

    return caregiverRoomIds.some((roomId) => patientRoomIds.includes(roomId));
  }

  async getSnapshotOwnerUserId(snapshotId: string): Promise<string | null> {
    const snapshot = await this.prisma.snapshots.findUnique({
      where: { snapshot_id: snapshotId },
      select: { user_id: true },
    });
    return snapshot?.user_id || null;
  }

  async getEventOwnerUserId(eventId: string): Promise<string | null> {
    const event = await this.prisma.events.findUnique({
      where: { event_id: eventId },
      select: { user_id: true },
    });
    return event?.user_id || null;
  }

  async canUserAccessCamera(userId: string, cameraId: string): Promise<boolean> {
    const camera = await this.prisma.cameras.findUnique({
      where: { camera_id: cameraId },
      select: { user_id: true },
    });
    return camera?.user_id === userId;
  }

  async getSharedPermissions(caregiverId: string, customerId: string) {
    return this.prisma.access_grants.findUnique({
      where: {
        customer_id_caregiver_id: {
          customer_id: customerId,
          caregiver_id: caregiverId,
        },
      },
    });
  }

  async isCaregiverAssignedToRoom(caregiverId: string, roomId: string): Promise<boolean> {
    const assignment = await this.prisma.user_preferences.findFirst({
      where: {
        user_id: caregiverId,
        category: 'user_room_assignments',
        setting_value: {
          contains: `"room_id":"${roomId}"`,
        },
      },
    });
    return !!assignment;
  }

  async getSharedPermissionsForPair(caregiverId: string, customerId: string) {
    return this.getSharedPermissions(caregiverId, customerId);
  }
}
