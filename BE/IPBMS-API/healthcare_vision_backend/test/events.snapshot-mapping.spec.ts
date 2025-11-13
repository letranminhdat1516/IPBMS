import { EventsService } from '../src/application/services/events/events.service';

describe('Event snapshot mapping', () => {
  let mockEventsRepo: any;
  let svc: EventsService;

  beforeEach(() => {
    mockEventsRepo = {
      listAll: jest.fn().mockResolvedValue([
        {
          event_id: 'e1',
          snapshot_id: 's1',
          snapshots: { files: [{ cloud_url: 'https://a' }] },
          detected_at: new Date(),
        },
      ]),
      listAllForCaregiver: jest.fn().mockResolvedValue([
        {
          event_id: 'e2',
          snapshot_id: 's2',
          snapshots: { files: [{ cloud_url: 'https://b' }] },
          detected_at: new Date(),
        },
      ]),
      recentByUser: jest.fn().mockResolvedValue([
        {
          event_id: 'e3',
          snapshot_id: 's3',
          snapshots: { files: [{ cloud_url: 'https://c' }] },
          detected_at: new Date(),
        },
      ]),
      listPaginated: jest.fn().mockResolvedValue({
        data: [
          {
            event_id: 'p1',
            snapshot_id: 's4',
            snapshots: { files: [{ cloud_url: 'https://d' }] },
            detected_at: new Date(),
          },
        ],
        total: 1,
      }),
      listPaginatedForCaregiverByUserId: jest.fn().mockResolvedValue({
        data: [
          {
            event_id: 'p2',
            snapshot_id: 's5',
            snapshots: { files: [{ cloud_url: 'https://e' }] },
            detected_at: new Date(),
          },
        ],
        total: 1,
      }),
      listPaginatedForOwnerUserId: jest.fn().mockResolvedValue({
        data: [
          {
            event_id: 'p3',
            snapshot_id: 's6',
            snapshots: { files: [{ cloud_url: 'https://f' }] },
            detected_at: new Date(),
          },
        ],
        total: 1,
      }),
      findByIdWithContext: jest.fn().mockResolvedValue({
        event_id: 'd1',
        snapshot_id: 's7',
        event_type: 'fall',
        snapshots: { files: [{ cloud_url: 'https://g' }] },
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

  it('listAll returns snapshot_id and snapshot_url', async () => {
    const out = await svc.listAll(10);
    expect(Array.isArray(out)).toBe(true);
    expect(out[0].snapshot_id).toBe('s1');
    expect(out[0].snapshot_url).toBe('https://a');
    expect(out[0].snapshot).toEqual({ snapshot_id: 's1', cloud_url: 'https://a' });
  });

  it('listPaginated includes snapshot_id on data items', async () => {
    const res = await svc.listPaginated({ page: 1, limit: 10 });
    expect(res.data[0].snapshot_id).toBe('s4');
    expect(res.data[0].snapshot_url).toBe('https://d');
  });

  it('getDetail returns normalized snapshot', async () => {
    const d = await svc.getDetail('d1');
    expect(d.snapshot_id).toBe('s7');
    expect(d.snapshot_url).toBe('https://g');
  });

  it('getDetail includes event_type in response', async () => {
    const d = await svc.getDetail('d1');
    expect(d.event_type).toBe('fall');
  });
});
