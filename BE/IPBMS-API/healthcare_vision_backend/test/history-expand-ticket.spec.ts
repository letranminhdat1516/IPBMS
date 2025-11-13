import { HistoryService } from '../src/modules/tickets/history.service';

// Create minimal mock Prisma service
const mockPrisma: any = {};

describe('HistoryService.expandHistoryRow', () => {
  const svc = new HistoryService(mockPrisma as any);

  it('detects nested object changes using deep-equal', () => {
    const row: any = {
      old_values: { a: { x: 1, y: 2 } },
      new_values: { a: { y: 2, x: 1 } }, // same keys different order
    };
    const expanded = svc.expandHistoryRow(row as any, { limit: 10 });
    expect(expanded.change_count).toBe(0);
    expect(expanded.changes.length).toBe(0);
  });

  it('respects limit parameter', () => {
    const row: any = {
      old_values: { a: 1, b: 2, c: 3 },
      new_values: { a: 9, b: 8, c: 7 },
    };
    const expanded = svc.expandHistoryRow(row as any, { limit: 2 });
    expect(expanded.change_count).toBe(2);
    expect(expanded.changes.length).toBe(2);
  });
});
