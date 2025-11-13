import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private _reconnectInterval?: ReturnType<typeof setInterval>;
  private readonly _reconnectMs = Number(process.env.DB_RECONNECT_MS ?? '10000'); // 10s default

  // Track connected state to avoid redundant disconnect attempts
  private _connected = false;
  // Track whether a connect attempt is currently in flight to avoid concurrent $connect calls
  private _connecting = false;

  constructor() {
    // Allow pool settings to be configured via environment variables.
    // Bumped defaults to reduce connection pool exhaustion observed in cron-heavy workloads.
    const poolTimeout = process.env.DB_POOL_TIMEOUT ?? '120'; // seconds
    // Default to a small connection limit to avoid exhausting DB slots in multi-instance environments.
    // This can be increased via env when necessary.
    const connectionLimit = process.env.DB_CONNECTION_LIMIT ?? '3';
    const connectTimeout = process.env.DB_CONNECT_TIMEOUT ?? '10';
    const pgbouncer = process.env.DB_PGBOUNCER ?? 'true';

    const buildUrlWithParams = (base: string) => {
      if (!base) return base;
      // If DATABASE_URL already has query params, append with & otherwise with ?
      const hasQuery = base.includes('?');
      const params = `pool_timeout=${poolTimeout}&connection_limit=${connectionLimit}&connect_timeout=${connectTimeout}&pgbouncer=${pgbouncer}`;
      return hasQuery ? `${base}&${params}` : `${base}?${params}`;
    };

    const dbUrl = buildUrlWithParams(process.env.DATABASE_URL ?? '');

    // Avoid printing full DATABASE_URL (secrets). Print only a hint whether pool params were applied.
    const debugMsg = dbUrl
      ? `Prisma will connect using a DATABASE_URL with pool params (connection_limit=${connectionLimit}, pool_timeout=${poolTimeout})`
      : 'Prisma DATABASE_URL not configured.';
    Logger.debug(debugMsg, 'PrismaService');

    super({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: dbUrl,
        },
      },
      transactionOptions: {
        timeout: 30000,
        maxWait: 10000,
      },
    });
  }

  async onModuleInit() {
    // Prevent concurrent connect attempts
    if (this._connected || this._connecting) {
      Logger.debug(
        'Prisma already connected or connecting; skipping initial connect',
        'PrismaService',
      );
      return;
    }

    this._connecting = true;
    try {
      await this.$connect();
      this._connected = true;
      Logger.log('Prisma connected to database', 'PrismaService');
      // If there was a reconnect interval scheduled earlier, clear it now
      if (this._reconnectInterval) {
        clearInterval(this._reconnectInterval);
        this._reconnectInterval = undefined;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Logger.warn(`Prisma initial connect failed: ${msg}`, 'PrismaService');

      // Schedule reconnect attempts, but ensure only one concurrent attempt runs
      if (!this._reconnectInterval) {
        this._reconnectInterval = setInterval(async () => {
          if (this._connected || this._connecting) {
            // If already connected or another attempt is running, skip this tick
            return;
          }

          this._connecting = true;
          try {
            Logger.debug('Attempting to reconnect Prisma...', 'PrismaService');
            await this.$connect();
            this._connected = true;
            Logger.log('Prisma reconnected to database', 'PrismaService');
            if (this._reconnectInterval) {
              clearInterval(this._reconnectInterval);
              this._reconnectInterval = undefined;
            }
          } catch (reErr) {
            const rmsg = reErr instanceof Error ? reErr.message : String(reErr);
            Logger.warn(`Prisma reconnect attempt failed: ${rmsg}`, 'PrismaService');
          } finally {
            this._connecting = false;
          }
        }, this._reconnectMs);
      }
    } finally {
      this._connecting = false;
    }
  }

  async onModuleDestroy() {
    if (this._reconnectInterval) {
      clearInterval(this._reconnectInterval);
      this._reconnectInterval = undefined;
    }

    try {
      if (this._connected) {
        await this.$disconnect();
        this._connected = false;
      }
    } catch (err) {
      Logger.warn(`Prisma disconnect failed: ${(err as Error).message || err}`, 'PrismaService');
    }
  }
}
