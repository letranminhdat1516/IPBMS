import { SharedPermissionsService } from '../src/application/services/shared-permissions.service';

describe('SharedPermissionsService invalidate cache', () => {
  let svc: SharedPermissionsService;
  const mockRepo: any = {
    upsert: jest.fn(),
    deletePermission: jest.fn(),
    findByCustomerAndCaregiver: jest.fn(),
  };
  const mockAcl: any = {
    invalidatePair: jest.fn(),
  };
  const mockPrisma: any = {
    // Mock PrismaService methods if needed
  };

  beforeEach(() => {
    mockRepo.upsert.mockReset();
    mockRepo.deletePermission.mockReset();
    mockAcl.invalidatePair.mockReset();

    svc = new SharedPermissionsService(mockRepo as any, mockAcl as any, mockPrisma as any);
  });

  it('should call invalidatePair on update', async () => {
    mockRepo.upsert.mockResolvedValue({ stream_view: true });
    const res = await svc.update('cust1', 'cg1', { stream_view: true });
    expect(mockRepo.upsert).toHaveBeenCalledWith('cust1', 'cg1', expect.any(Object));
    expect(mockAcl.invalidatePair).toHaveBeenCalledWith('cg1', 'cust1');
  });

  it('should call invalidatePair on remove', async () => {
    mockRepo.deletePermission.mockResolvedValue(1);
    const res = await svc.remove('cust2', 'cg2');
    expect(mockRepo.deletePermission).toHaveBeenCalledWith('cust2', 'cg2');
    expect(mockAcl.invalidatePair).toHaveBeenCalledWith('cg2', 'cust2');
  });
});
