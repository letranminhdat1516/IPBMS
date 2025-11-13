import { AccessControlService } from '../src/application/services/access-control.service';

describe('AccessControlService (unit)', () => {
  const mockRepo: any = {
    isCaregiverExplicitlyAssigned: jest.fn().mockResolvedValue(true),
    isCaregiverAssignedToPatientByRoom: jest.fn().mockResolvedValue(false),
    getSharedPermissionsForPair: jest.fn(),
  };

  const svc = new AccessControlService(mockRepo);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when not assigned', async () => {
    mockRepo.isCaregiverExplicitlyAssigned.mockResolvedValue(false);
    mockRepo.isCaregiverAssignedToPatientByRoom.mockResolvedValue(false);
    const perms = await svc.getSharedPermissions('cg1', 'pt1');
    expect(perms).toBeNull();
  });

  it('returns permission object when assigned', async () => {
    mockRepo.isCaregiverExplicitlyAssigned.mockResolvedValue(true);
    mockRepo.getSharedPermissionsForPair.mockResolvedValue({
      'stream:view': true,
      log_access_days: 7,
    });
    const perms = await svc.getSharedPermissions('cg2', 'pt2');
    expect(perms).toEqual({ 'stream:view': true, log_access_days: 7 });
  });

  it('hasPermission recognizes boolean/number/array', async () => {
    mockRepo.isCaregiverExplicitlyAssigned.mockResolvedValue(true);
    mockRepo.getSharedPermissionsForPair.mockResolvedValue({
      'stream:view': true,
      log_access_days: 5,
      notification_channel: ['push', 'sms'],
    });

    expect(await svc.hasPermission('cg3', 'pt3', 'stream:view')).toBe(true);
    expect(await svc.hasPermission('cg3', 'pt3', 'log_access_days')).toBe(true);
    expect(await svc.hasPermission('cg3', 'pt3', 'notification_channel')).toBe(true);
    expect(await svc.hasPermission('cg3', 'pt3', 'unknown')).toBe(false);
  });
});
