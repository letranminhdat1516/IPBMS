import { EventAuditLogService } from '../src/application/services/events/event-audit-log.service';

const mockPrisma: any = {};

describe('EventAuditLogService.expandHistoryRow', () => {
  const mockRepo: any = {};
  const svc = new EventAuditLogService(mockPrisma as any, mockRepo as any);

  it('detects metadata changes and nested equality', () => {
    const row: any = {
      previous_status: 'danger',
      new_status: 'danger',
      metadata: {
        previous: { notes: { a: 1, b: 2 } },
        new: { notes: { b: 2, a: 1 } },
      },
    };
    // metadata.previous and metadata.new are equivalent despite key ordering
    const expanded = svc.expandHistoryRow(row, { limit: 10 });
    // no change because status same and metadata equivalent
    expect(expanded.change_count).toBe(0);
  });

  it('includes status change and respects limit', () => {
    const row: any = {
      previous_status: 'new',
      new_status: 'confirmed',
      previous_event_type: 'abnormal_behavior',
      new_event_type: 'abnormal_behavior',
      metadata: { notes: 'ok' },
    };
    const expanded = svc.expandHistoryRow(row, { limit: 1 });
    expect(expanded.change_count).toBe(1);
    expect(expanded.changes.length).toBe(1);
  });
});
