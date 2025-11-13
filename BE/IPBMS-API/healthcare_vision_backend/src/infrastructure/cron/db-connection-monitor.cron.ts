import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DbConnectionMonitorCron {
  private readonly logger = new Logger(DbConnectionMonitorCron.name);

  constructor(private readonly _prisma: PrismaService) {}

  // Default run every 5 minutes. Disabled by default via env var.
  @Cron('*/5 * * * *')
  async monitorConnections() {
    if (process.env.DB_CONNECTION_MONITOR_ENABLED !== 'true') return;

    try {
      // Query pg_stat_activity for counts per state (requires appropriate DB permissions)
      const rows: Array<{ state: string | null; count: bigint }> = await this._prisma.$queryRaw`
        SELECT state, count(*) as count
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state
      `;

      const counts = rows.reduce(
        (acc: Record<string, number>, r) => {
          const key = r.state ?? 'unknown';
          acc[key] = Number(r.count ?? 0);
          return acc;
        },
        {} as Record<string, number>,
      );

      this.logger.log(`DB connection states: ${JSON.stringify(counts)}`);
    } catch (err) {
      this.logger.warn('Failed to query pg_stat_activity for DB connection monitoring', err as any);
    }
  }
}
