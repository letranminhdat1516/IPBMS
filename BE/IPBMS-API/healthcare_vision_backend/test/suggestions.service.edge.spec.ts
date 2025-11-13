import { SuggestionsService } from '../src/application/services/ai/suggestions.service';
import { BadRequestException } from '@nestjs/common';

describe('SuggestionsService edge cases', () => {
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
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    service = new SuggestionsService(mockPrisma as any);
  });

  it('throws when until_date is in the past', async () => {
    const past = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    await expect(
      service.toggleSkip(
        { action: 'skip', duration: 'until_date', scope: 'all', until_date: past },
        'u1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('keeps longer existing item skip_until when merging', async () => {
    const existingUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7d
    mockPrisma.suggestions.findUnique.mockResolvedValue({
      suggestion_id: 's1',
      skip_until: existingUntil.toISOString(),
    });
    mockPrisma.suggestions.upsert.mockResolvedValue({
      suggestion_id: 's1',
      skip_until: existingUntil,
    });

    // request a shorter skip (24h)
    const res = await service.toggleSkip(
      { action: 'skip', duration: '24h', scope: 'item', reason: 'test' },
      'u1',
      's1',
    );
    expect(mockPrisma.suggestions.upsert).toHaveBeenCalled();
    const upsertArg = mockPrisma.suggestions.upsert.mock.calls[0][0];
    // ensure the final skip_until equals existingUntil (the longer one)
    expect(new Date(upsertArg.update.skip_until).getTime()).toBe(new Date(existingUntil).getTime());
    expect(res.scope).toBe('item');
  });

  it('ingestSuggestion sets next_notify_at null when TTL expired', async () => {
    // make TTL very small
    process.env.SUGGESTIONS_TTL_DAYS = '0';
    mockPrisma.suggestions.findFirst.mockResolvedValue(null);
    mockPrisma.suggestions.create.mockResolvedValue({ suggestion_id: 'new' });

    await service.ingestSuggestion('u1', {
      resource_type: 'r',
      resource_id: 'rid',
      type: 't',
      title: 't',
      message: 'm',
    });
    expect(mockPrisma.suggestions.create).toHaveBeenCalled();
    const called = mockPrisma.suggestions.create.mock.calls[0][0];
    expect(called.data.next_notify_at).toBeNull();
    delete process.env.SUGGESTIONS_TTL_DAYS;
  });

  it('ingestSuggestion sets next_notify_at to now for high priority', async () => {
    mockPrisma.suggestions.findFirst.mockResolvedValue(null);
    mockPrisma.suggestions.create.mockResolvedValue({ suggestion_id: 'new' });
    const before = Date.now();
    await service.ingestSuggestion('u1', {
      resource_type: 'r',
      resource_id: 'rid',
      type: 't',
      title: 't',
      message: 'm',
      priority: 'high',
    });
    const called = mockPrisma.suggestions.create.mock.calls[0][0];
    expect(called.data.next_notify_at).toBeInstanceOf(Date);
    const then = new Date(called.data.next_notify_at).getTime();
    expect(then).toBeGreaterThanOrEqual(before);
    expect(then).toBeLessThanOrEqual(Date.now() + 1000);
  });
});
