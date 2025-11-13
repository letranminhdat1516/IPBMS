import { runWithAdvisoryLock } from '../../../src/shared/utils/db.util';

describe('db.util', () => {
  test('runWithAdvisoryLock acquires lock and runs transaction', async () => {
    const mockTx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
    } as any;

    const mockPrisma = {
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
    } as any;

    const result = await runWithAdvisoryLock(mockPrisma, 'sub_123', async (tx) => {
      // assert tx is the mock transaction object
      expect(tx).toBe(mockTx);
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockTx.$executeRaw).toHaveBeenCalled();
  });
});
