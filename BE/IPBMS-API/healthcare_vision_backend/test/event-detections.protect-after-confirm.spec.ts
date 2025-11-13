import { ForbiddenException } from '@nestjs/common';
import { EventDetectionsService } from '../src/application/services/event-detections.service';

describe('EventDetectionsService - protect updates after customer confirmation', () => {
  let service: EventDetectionsService;
  let repoMock: any;
  let prismaMock: any;

  beforeEach(() => {
    repoMock = {
      findEventById: jest.fn(),
      updateEvent: jest.fn(),
    } as any;

    prismaMock = {
      cameras: { findUnique: jest.fn() },
      caregiver_invitations: { findMany: jest.fn() },
    } as any;

    service = new EventDetectionsService(repoMock as any, prismaMock as any, undefined);
  });

  it('should forbid caregiver (non-owner) from updating event after CONFIRMED_BY_CUSTOMER', async () => {
    const event = {
      event_id: 'evt-1',
      confirmation_state: 'CONFIRMED_BY_CUSTOMER',
      user_id: 'owner-1',
    } as any;

    // repo.findEventById will be used inside getEventById call
    jest.spyOn(repoMock, 'findEventById').mockResolvedValue(event);
    // camera owned by someone else
    prismaMock.cameras.findUnique = jest.fn().mockResolvedValue({
      camera_id: 'cam-1',
      user_id: 'owner-1',
    });
    // caregiver assignments empty => caller is not caregiver
    jest.spyOn(prismaMock.caregiver_invitations, 'findMany').mockResolvedValue([]);

    // Now call updateEvent with a different user id (non-owner)
    await expect(
      service.updateEvent('evt-1', { status: 'resolved' as any }, 'not-owner'),
    ).rejects.toThrow(ForbiddenException);
  });
});
