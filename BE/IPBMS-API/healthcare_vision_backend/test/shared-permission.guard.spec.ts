import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SharedPermissionGuard } from '../src/shared/guards/shared-permission.guard';
import { SharedPermissionsService } from '../src/application/services/shared-permissions.service';

function makeCtx(req: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('SharedPermissionGuard', () => {
  let guard: SharedPermissionGuard;
  const reflector = new Reflector();

  beforeEach(() => {
    // Mock getAllAndOverride to return false (don't skip guard)
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    // Mock get to return a permission key
    jest.spyOn(reflector, 'get').mockReturnValue('stream:view');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows admin without checking permissions', async () => {
    const mockService = { checkPermission: jest.fn() } as unknown as SharedPermissionsService;
    const mockPrisma = {} as any; // minimal mock for PrismaService
    guard = new SharedPermissionGuard(reflector, mockService, mockPrisma);

    const req = { user: { userId: '550e8400-e29b-41d4-a716-446655440000', role: 'admin' } };
    const ok = await guard.canActivate(makeCtx(req));
    expect(ok).toBe(true);
    expect(mockService.checkPermission).not.toHaveBeenCalled();
  });

  it('allows customer to access their own resources', async () => {
    const mockService = { checkPermission: jest.fn() } as unknown as SharedPermissionsService;
    const mockPrisma = {} as any;
    guard = new SharedPermissionGuard(reflector, mockService, mockPrisma);

    const req = {
      user: { userId: '11111111-1111-4111-8111-111111111111', role: 'customer' },
      params: { customer_id: '11111111-1111-4111-8111-111111111111' },
    };
    const ok = await guard.canActivate(makeCtx(req));
    expect(ok).toBe(true);
    expect(mockService.checkPermission).not.toHaveBeenCalled();
  });

  it('allows caregiver when shared permission exists', async () => {
    const mockService = {
      getByCustomerAndCaregiver: jest.fn().mockResolvedValue({ 'stream:view': true }),
    } as unknown as SharedPermissionsService;
    const mockPrisma = {} as any;
    guard = new SharedPermissionGuard(reflector, mockService, mockPrisma);

    const req = {
      user: { userId: '22222222-2222-4222-8222-222222222222', role: 'caregiver' },
      params: { customer_id: '11111111-1111-4111-8111-111111111111' },
    };
    const ok = await guard.canActivate(makeCtx(req));
    expect(ok).toBe(true);
    expect(mockService.getByCustomerAndCaregiver).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    );
  });

  it('denies caregiver when shared permission missing', async () => {
    const mockService = {
      getByCustomerAndCaregiver: jest.fn().mockResolvedValue({ 'stream:view': false }),
    } as unknown as SharedPermissionsService;
    const mockPrisma = {} as any;
    guard = new SharedPermissionGuard(reflector, mockService, mockPrisma);

    const req = {
      user: { userId: '22222222-2222-4222-8222-222222222222', role: 'caregiver' },
      params: { customer_id: '11111111-1111-4111-8111-111111111111' },
    };
    await expect(guard.canActivate(makeCtx(req))).rejects.toThrow(ForbiddenException);
    expect(mockService.getByCustomerAndCaregiver).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    );
  });
});
