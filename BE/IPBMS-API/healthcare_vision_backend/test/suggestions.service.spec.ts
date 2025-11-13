import { SuggestionsService } from '../src/application/services/ai/suggestions.service';

describe('SuggestionsService', () => {
  let service: SuggestionsService;
  const mockPrisma: any = {
    user_preferences: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    suggestions: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    service = new SuggestionsService(mockPrisma as any);
    mockPrisma.user_preferences.upsert.mockClear();
    mockPrisma.user_preferences.deleteMany.mockClear();
    mockPrisma.user_preferences.findFirst.mockClear();
    mockPrisma.suggestions.upsert.mockClear();
    mockPrisma.suggestions.findUnique.mockClear();
  });

  it('should upsert a type mute into user_preferences', async () => {
    mockPrisma.user_preferences.upsert.mockResolvedValue({});
    mockPrisma.user_preferences.findFirst.mockResolvedValue(null);
    const res = await service.toggleSkip(
      { action: 'skip', duration: '1h', scope: 'type', type: 'fallRisk', reason: 'test' },
      'user-1',
      '_',
    );
    expect(mockPrisma.user_preferences.upsert).toHaveBeenCalled();
    expect(res.status).toBe('skipped');
    expect(res.scope).toBe('type');
  });

  it('should delete preference on unskip', async () => {
    // New behavior: unskip for type/all upserts a preference with is_enabled=false (keeps audit)
    mockPrisma.user_preferences.upsert.mockResolvedValue({});
    const res = await service.toggleSkip({ action: 'unskip', scope: 'all' }, 'user-1', '_');
    expect(mockPrisma.user_preferences.upsert).toHaveBeenCalled();
    const upsertArg = mockPrisma.user_preferences.upsert.mock.calls[0][0];
    expect(upsertArg.create.is_enabled).toBe(false);
    expect(res.status).toBe('active');
  });

  it('isMutedForUser returns true for mute:all pref', () => {
    const svc = new SuggestionsService({} as any);
    const suggestion = { user_id: 'uX', type: 'fallRisk', skip_until: null };
    const prefsMap: any = {
      uX: {
        'mute:all': {
          is_enabled: true,
          setting_value: JSON.stringify({ until: null, reason: 'user muted' }),
        },
      },
    };
    const r = svc.isMutedForUser(suggestion as any, prefsMap, new Date());
    expect(r.muted).toBe(true);
    expect(r.prefKey).toBe('mute:all');
  });

  it('list returns muted flag when includeMuted=true', async () => {
    const prismaStub: any = {
      suggestions: {
        findMany: jest.fn().mockResolvedValue([
          {
            suggestion_id: 's1',
            user_id: 'u1',
            type: 't1',
            message: 'm1',
            skip_until: null,
            next_notify_at: null,
            last_notified_at: null,
            skip_scope: null,
            skip_type: null,
            skip_reason: null,
            created_at: new Date(),
            updated_at: new Date(),
            resource_type: null,
            resource_id: null,
          },
        ]),
      },
      user_preferences: {
        findMany: jest.fn().mockResolvedValue([
          {
            user_id: 'u1',
            setting_key: 'mute:type:t1',
            is_enabled: true,
            setting_value: JSON.stringify({
              until: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
              reason: 'temp',
            }),
          },
        ]),
      },
    };
    const svc = new SuggestionsService(prismaStub as any);
    const items = await svc.list('u1', { includeMuted: true });
    expect(items).toHaveLength(1);
    expect(items[0].muted).toBe(true);
    expect(items[0].mute_reason).toBeDefined();
  });

  it('should upsert item suggestion', async () => {
    mockPrisma.suggestions.upsert.mockResolvedValue({
      suggestion_id: 's1',
      skip_until: new Date().toISOString(),
      next_notify_at: null,
    });
    mockPrisma.suggestions.findUnique.mockResolvedValue(null);
    const res = await service.toggleSkip(
      { action: 'skip', duration: '24h', scope: 'item', reason: 'foo' },
      'user-1',
      's1',
    );
    expect(mockPrisma.suggestions.upsert).toHaveBeenCalled();
    expect(res.scope).toBe('item');
  });
});
