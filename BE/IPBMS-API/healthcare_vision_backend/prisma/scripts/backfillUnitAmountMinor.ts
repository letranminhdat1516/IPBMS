#!/usr/bin/env node
/*
 * TypeScript idempotent backfill script for subscriptions.plan_snapshot and subscriptions.unit_amount_minor
 * - Idempotent: only updates when necessary
 * - Batching: processes in batches to avoid long transactions
 * - Dry-run: use --dry to see intended updates without writing
 *
 * Usage:
 *   # compile via ts-node or run with `node -r ts-node/register prisma/scripts/backfillUnitAmountMinor.ts` if ts-node is available
 *   node prisma/scripts/backfillUnitAmountMinor.ts --dry --limit=1000 --batch=100
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Args = {
  dry?: boolean;
  limit: number;
  batch: number;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const out: any = { dry: false, limit: 1000, batch: 100 };
  args.forEach((a) => {
    if (a === '--dry' || a === 'dry') out.dry = true;
    if (a.startsWith('--limit=')) out.limit = Number(a.split('=')[1]);
    if (a.startsWith('--batch=')) out.batch = Number(a.split('=')[1]);
  });
  return out;
}

function safeBigInt(v: any): bigint | null {
  if (v == null) return null;
  try {
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number') return BigInt(Math.trunc(v));
    if (typeof v === 'string') return BigInt(v);
    // attempt to read nested value
    if (typeof v === 'object' && 'toString' in v) return BigInt(String(v));
  } catch {
    return null;
  }
  return null;
}

function unitAmountFromSnapshot(snapshot: any): bigint | null {
  if (!snapshot) return null;
  // prefer `unit_amount_minor` if present
  if (snapshot.unit_amount_minor != null) return safeBigInt(snapshot.unit_amount_minor);
  // if `unit_amount` (major currency) exists, we can't safely convert here without currency info — skip
  if (snapshot.unit_amount != null) return null;
  return null;
}

async function main() {
  const { dry, limit, batch } = parseArgs();
  console.log(`Backfill plan_snapshot (dry=${dry}) limit=${limit} batch=${batch}`);

  // fetch subscriptions that need work (plan_snapshot NULL or unit_amount_minor NULL)
  const candidates = await prisma.subscriptions.findMany({
    where: {
      // cast to any to satisfy TS types for null checks in this ad-hoc script
      OR: [{ plan_snapshot: null as any }, { unit_amount_minor: null as any }],
    } as any,
    take: limit,
    select: { subscription_id: true, user_id: true, plan_snapshot: true, unit_amount_minor: true },
    orderBy: { subscription_id: 'asc' },
  });

  console.log(`Found ${candidates.length} candidate subscriptions`);

  let processed = 0;
  let updated = 0;

  for (let i = 0; i < candidates.length; i += batch) {
    const chunk = candidates.slice(i, i + batch);
    console.log(`Processing chunk ${i}..${i + chunk.length} (total ${candidates.length})`);

    // process each subscription sequentially to avoid large transactions and keep logs readable
    for (const sub of chunk) {
      processed++;
      try {
        // find latest paid transaction for this subscription that has a plan_snapshot or amount_total
        const tx = await prisma.transactions.findFirst({
          where: {
            subscription_id: sub.subscription_id,
            status: 'paid',
            OR: [{ plan_snapshot: { not: null } as any }, { amount_total: { not: null } as any }],
          } as any,
          orderBy: { paid_at: 'desc' },
          select: { plan_snapshot: true, amount_total: true, paid_at: true, tx_id: true },
        });

        if (!tx) {
          console.log(`  - ${sub.subscription_id}: no suitable paid transaction found`);
          continue;
        }

        const snap = tx.plan_snapshot || null;
        const derivedUnitAmount =
          unitAmountFromSnapshot(snap) ?? safeBigInt(tx.amount_total) ?? null;

        const willUpdatePlanSnapshot = sub.plan_snapshot == null && snap != null;
        const willUpdateUnitAmount = sub.unit_amount_minor == null && derivedUnitAmount != null;

        if (!willUpdatePlanSnapshot && !willUpdateUnitAmount) {
          console.log(
            `  - ${sub.subscription_id}: nothing to update (already populated or no derived values)`,
          );
          continue;
        }

        if (dry) {
          console.log(
            `  - DRY: would update ${sub.subscription_id} with tx=${tx.tx_id} paid_at=${tx.paid_at} plan_snapshot=${snap ? 'yes' : 'no'} unit_amount_minor=${String(derivedUnitAmount)}`,
          );
          continue;
        }

        // perform idempotent update within a transaction: only set fields if still missing
        await prisma.$transaction(async (txClient) => {
          // re-read current subscription within transaction to avoid races
          const current = await txClient.subscriptions.findUnique({
            where: { subscription_id: sub.subscription_id },
            select: { plan_snapshot: true, unit_amount_minor: true },
          });
          if (!current) return;

          const data: any = {};
          if (current.plan_snapshot == null && snap != null) data.plan_snapshot = snap;
          if (current.unit_amount_minor == null && derivedUnitAmount != null)
            data.unit_amount_minor = derivedUnitAmount;

          if (Object.keys(data).length === 0) {
            // nothing to do
            return;
          }

          await txClient.subscriptions.update({
            where: { subscription_id: sub.subscription_id },
            data,
          });
        });

        updated++;
        console.log(`  - updated ${sub.subscription_id}`);
      } catch (err) {
        console.error(`  - failed ${sub.subscription_id}:`, String(err));
      }
    }
  }

  console.log(`Done. Processed=${processed} Updated=${updated}`);
}

main()
  .catch((e) => {
    console.error('Fatal error', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
