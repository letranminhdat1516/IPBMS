import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map((item) => convertBigIntToString(item));
  if (typeof obj === 'object') {
    const converted = { ...obj };
    for (const key in converted) {
      if (Object.prototype.hasOwnProperty.call(converted, key)) {
        converted[key] = convertBigIntToString(converted[key]);
      }
    }
    return converted;
  }
  return obj;
}

async function backfillBatch(batchSize = 200) {
  // Prisma's typed JSON filters can be awkward across generated types; to keep this script simple
  // we fetch a batch and filter on the JS side for subscriptions that don't have a plan_snapshot.
  const subsBatch = await prisma.subscriptions.findMany({
    include: { plans: true },
    take: batchSize,
  });

  const subs = subsBatch.filter((s) => s.plan_snapshot === null || s.plan_snapshot === undefined);

  if (subs.length === 0) return 0;

  for (const s of subs) {
    try {
      let plan = (s as any).plans ?? null;

      if (!plan && s.plan_code) {
        plan = await prisma.plans.findFirst({ where: { code: s.plan_code } });
      }

      const snapshot = plan ? convertBigIntToString(plan) : {};

      await prisma.subscriptions.update({
        where: { subscription_id: s.subscription_id },
        data: { plan_snapshot: snapshot },
      });

      console.log(
        `Backfilled subscription ${s.subscription_id} -> ${plan ? 'plan snapshot' : 'empty snapshot'}`,
      );
    } catch (err) {
      console.error(`Failed to backfill subscription ${s.subscription_id}:`, err);
    }
  }

  return subs.length;
}

async function main() {
  console.log('Starting backfill of plan_snapshot on subscriptions...');
  let total = 0;
  while (true) {
    const count = await backfillBatch(200);
    if (!count || count === 0) break;
    total += count;
    // small delay to reduce DB load
    await new Promise((r) => setTimeout(r, 250));
  }
  console.log(`Backfill complete. Updated ${total} subscriptions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
