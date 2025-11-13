import { EventsService } from '../src/application/services/events/events.service';

describe('Event snapshot mapping - multiple files', () => {
  let mockEventsRepo: any;
  let svc: EventsService;

  beforeEach(() => {
    mockEventsRepo = {
      listAll: jest.fn().mockResolvedValue([
        {
          event_id: 'e1',
          snapshot_id: 's1',
          snapshots: {
            files: [
              { cloud_url: 'https://old', created_at: new Date('2020-01-01') },
              { cloud_url: 'https://new', created_at: new Date('2020-02-01') },
            ],
          },
          detected_at: new Date(),
        },
      ]),
      findByIdWithContext: jest.fn().mockResolvedValue({
        event_id: 'd1',
        snapshot_id: 's1',
        snapshots: { files: [{ cloud_url: null, created_at: new Date() }] },
        detected_at: new Date(),
      }),
    } as any;

    svc = new EventsService(
      mockEventsRepo as any,
      {} as any,
      {} as any,
      {} as any,
      undefined as any,
    );
  });

  it('selects newest file for snapshot_url', async () => {
    const out = await svc.listAll(10);
    expect(out[0].snapshot_id).toBe('s1');
    expect(out[0].snapshot_url).toBe('https://new');
  });

  it('handles null cloud_url gracefully in getDetail', async () => {
    const d = await svc.getDetail('d1');
    expect(d.snapshot_id).toBe('s1');
    expect(d.snapshot_url).toBeNull();
  });
});
