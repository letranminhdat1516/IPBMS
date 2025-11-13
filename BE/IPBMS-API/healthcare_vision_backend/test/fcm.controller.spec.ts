import { FcmController } from '../src/presentation/controllers';
import { FcmService } from '../src/application/services/fcm.service';

describe('FcmController', () => {
  let controller: FcmController;
  let service: Partial<FcmService>;

  beforeEach(() => {
    service = {
      checkToken: jest.fn().mockResolvedValue({ exists: true }),
      pushActorMessage: jest
        .fn()
        .mockResolvedValue({ successCount: 1, failureCount: 0, responses: [], tokensMap: {} }),
      filterDeliverableTargets: jest.fn().mockResolvedValue(['user-1']),
    };
    // @ts-ignore
    controller = new FcmController(service as FcmService);
  });

  it('should call pushActorMessage and return result', async () => {
    const dto: any = {
      toUserIds: ['11111111-1111-4111-8111-111111111111'],
      direction: 'customer_to_caregiver',
      category: 'help',
      message: 'Need help',
      fromToken: 'token-123',
      fromUserId: '44444444-4444-4444-8444-444444444444',
    };
    const mockReq: any = { user: { userId: '55555555-5555-4555-8555-555555555555' } };
    (service as any).filterDeliverableTargets = jest
      .fn()
      .mockResolvedValue(['11111111-1111-4111-8111-111111111111']);

    const res = await controller.pushActorMessage(dto);
    expect(service.checkToken as any).toHaveBeenCalledWith(
      '44444444-4444-4444-8444-444444444444',
      'token-123',
    );
    expect(service.pushActorMessage as any).toHaveBeenCalled();
    expect(res).toHaveProperty('successCount', 1);
  });

  it('admin getAllTokens should forward params to service', async () => {
    (service as any).getAllTokens = jest
      .fn()
      .mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
    // @ts-ignore
    const ctrl = new FcmController(service as FcmService);
    const res = await (ctrl as any).getAllTokens('device', undefined, 1, 20, undefined, undefined);
    expect((service as any).getAllTokens).toHaveBeenCalled();
    expect(res).toHaveProperty('data');
  });

  it('admin bulkDeleteTokens should call service', async () => {
    (service as any).bulkDeleteTokens = jest.fn().mockResolvedValue({ deleted: 2 });
    // @ts-ignore
    const ctrl = new FcmController(service as FcmService);
    const res = await (ctrl as any).bulkDeleteTokens({ userIds: ['u1', 'u2'] });
    expect((service as any).bulkDeleteTokens).toHaveBeenCalledWith(['u1', 'u2'], undefined);
    expect(res).toHaveProperty('deleted', 2);
  });

  it('should allow customer sending caregiver_to_customer (no role validation)', async () => {
    const dto: any = {
      toUserIds: ['11111111-1111-4111-8111-111111111111'],
      direction: 'caregiver_to_customer',
      category: 'help',
      message: 'Direction test',
      fromUserId: '66666666-6666-4666-8666-666666666666',
    };
    const mockReq: any = {
      user: { userId: '66666666-6666-4666-8666-666666666666', role: 'customer' },
    };
    (service as any).filterDeliverableTargets = jest
      .fn()
      .mockResolvedValue(['11111111-1111-4111-8111-111111111111']);

    const res = await controller.pushActorMessage(dto);
    expect(service.pushActorMessage as any).toHaveBeenCalled();
    expect(res).toHaveProperty('successCount', 1);
  });

  it('should forbid when no deliverable recipients (non-admin)', async () => {
    (service as any).filterDeliverableTargets = jest.fn().mockResolvedValue([]);
    const dto: any = {
      toUserIds: ['77777777-7777-4777-8777-777777777777'],
      direction: 'customer_to_caregiver',
      category: 'help',
      message: 'No recipients',
      fromUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    };
    const mockReq: any = {
      user: { userId: '77777777-7777-4777-8777-777777777777', role: 'customer' },
    };

    await expect(controller.pushActorMessage(dto)).rejects.toThrow(
      'Không có recipients có thể gửi cho sender/direction này',
    );
  });

  it('should call filterDeliverableTargets even for admin', async () => {
    const dto: any = {
      toUserIds: ['88888888-8888-4888-8888-888888888888'],
      direction: 'customer_to_caregiver',
      category: 'help',
      message: 'Admin send',
      fromToken: 'token-999',
      fromUserId: '99999999-9999-4999-8999-999999999999',
    };
    const mockReq: any = {
      user: { userId: '99999999-9999-4999-8999-999999999999', role: 'admin' },
    };
    (service as any).filterDeliverableTargets = jest
      .fn()
      .mockResolvedValue(['88888888-8888-4888-8888-888888888888']);

    const res = await controller.pushActorMessage(dto);
    expect((service as any).filterDeliverableTargets).toHaveBeenCalled();
    expect(service.pushActorMessage as any).toHaveBeenCalled();
    expect(res).toHaveProperty('successCount', 1);
  });

  it('should allow pushActorMessage when unauthenticated but fromUserId provided', async () => {
    const dto: any = {
      toUserIds: ['11111111-1111-4111-8111-111111111111'],
      direction: 'customer_to_caregiver',
      category: 'help',
      message: 'Dev send',
      fromUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    };
    const mockReq: any = {}; // no authenticated user
    (service as any).filterDeliverableTargets = jest
      .fn()
      .mockResolvedValue(['11111111-1111-4111-8111-111111111111']);

    const res = await controller.pushActorMessage(dto);
    expect(service.pushActorMessage as any).toHaveBeenCalled();
    expect(res).toHaveProperty('successCount', 1);
  });

  it('should forbid when fromToken does not belong to sender', async () => {
    const dto: any = {
      toUserIds: ['11111111-1111-4111-8111-111111111111'],
      direction: 'customer_to_caregiver',
      category: 'help',
      message: 'Bad token',
      fromUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      fromToken: 'bad-token',
    };
    const mockReq: any = {}; // unauthenticated
    (service as any).checkToken = jest.fn().mockResolvedValue({ exists: false });

    await expect(controller.pushActorMessage(dto)).rejects.toThrow(
      'fromToken không thuộc về sender userId',
    );
  });
});
