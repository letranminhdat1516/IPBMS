import type { PrismaClient } from '@prisma/client';

/**
 * Run function inside a transaction that acquires a per-key advisory lock using hashtext(key).
 * Useful to provide lightweight cross-process synchronization.
 *
 * Example:
 * await runWithAdvisoryLock(prisma, subscriptionId, async (tx) => {
 *   // tx is the transactional client
 *   // do transactional work here; the advisory lock is held for the transaction
 * });
 */
export async function runWithAdvisoryLock<T>(
  prisma: PrismaClient,
  key: string | number,
  fn: (_tx: any) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Acquire advisory lock for the transaction using parameterized template to avoid injection
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${String(key)}))`;
    return fn(tx);
  });
}

export default { runWithAdvisoryLock };
