import { CaregiverInvitationsService } from '../src/application/services/users/caregiver-invitations.service';

describe('CaregiverInvitationsService (unit)', () => {
  let svc: CaregiverInvitationsService;
  let mockRepo: any;
  let mockUsersRepo: any;
  let mockAcl: any;
  let mockNotificationsService: any;
  let mockNotificationPrefs: any;

  beforeEach(() => {
    mockRepo = {
      assign: jest.fn().mockImplementation((caregiver_id, customer_id, assigned_by, notes) => {
        return Promise.resolve({
          assignment_id: 'a1',
          caregiver_id,
          customer_id,
          assigned_at: new Date(),
          is_active: true,
          assigned_by,
          assignment_notes: notes || null,
          status: 'pending',
        });
      }),
      findCustomersOfCaregiver: jest.fn().mockResolvedValue([]),
      findCaregiversOfCustomer: jest.fn().mockResolvedValue([]),
      findByAssignmentId: jest.fn().mockResolvedValue(null),
      updateStatus: jest.fn().mockImplementation((id, status, reason) => {
        return Promise.resolve({
          assignment_id: id,
          status,
          responded_at: new Date(),
          response_reason: reason || null,
        });
      }),
      findActive: jest.fn().mockResolvedValue([]),
      findAcceptedOtherCustomer: jest.fn().mockResolvedValue(null),
    };

    mockUsersRepo = {
      findUserByIdPublic: jest.fn().mockImplementation((id) => {
        // return different roles depending on id so service validations pass
        if (typeof id === 'string' && id.startsWith('cg')) {
          return Promise.resolve({
            user_id: id,
            username: `u_${id}`,
            full_name: `Caregiver ${id}`,
            role: 'caregiver',
          });
        }
        if (typeof id === 'string' && id.startsWith('cust')) {
          return Promise.resolve({
            user_id: id,
            username: `u_${id}`,
            full_name: `Customer ${id}`,
            role: 'customer',
          });
        }
        // admin or other
        return Promise.resolve({
          user_id: id,
          username: `u_${id}`,
          full_name: `User ${id}`,
          role: 'admin',
        });
      }),
    };

    mockAcl = {
      invalidatePair: jest.fn(),
    };

    mockNotificationsService = {
      create: jest.fn().mockResolvedValue({}),
    };

    mockNotificationPrefs = {
      shouldSendEventType: jest.fn().mockResolvedValue(false),
    };

    svc = new CaregiverInvitationsService(
      mockRepo,
      mockAcl as any,
      mockUsersRepo,
      mockNotificationsService,
      mockNotificationPrefs,
    );
  });

  it('assign should create assignment and list shows assigned_by_info', async () => {
    // Arrange
    const caregiverId = 'cg-1';
    const customerId = 'cust-1';
    // Act
    await svc.assign(caregiverId, customerId, 'admin-1', 'note-1');
    // Mock repo to return the created assignment on list
    mockRepo.findCaregiversOfCustomer.mockResolvedValueOnce([
      {
        assignment_id: 'a1',
        caregiver_id: caregiverId,
        customer_id: customerId,
        assigned_at: new Date(),
        is_active: true,
        assigned_by: 'admin-1',
        assignment_notes: 'note-1',
        caregiver: { full_name: 'CG One', username: 'cg1' },
      },
    ]);

    const list = await svc.listCaregiversOfCustomer(customerId);

    expect(list).toHaveLength(1);
    expect(list[0].assigned_by_info).toBeDefined();
    expect(list[0].assigned_by_info?.user_id).toBe('admin-1');
    expect(list[0].assignment_notes).toBe('note-1');
  });

  it('reject should set responded_at and response_reason', async () => {
    // Arrange
    const assignmentId = 'a-rej-1';
    mockRepo.findByAssignmentId.mockResolvedValueOnce({
      assignment_id: assignmentId,
      caregiver_id: 'cg-1',
      status: 'pending',
    });

    // Act
    const res = await svc.updateStatus(assignmentId, 'rejected', 'cg-1', 'not available');

    expect(res).toBeDefined();
    expect(res.response_reason).toBe('not available');
    expect(res.responded_at).toBeDefined();
  });
});
