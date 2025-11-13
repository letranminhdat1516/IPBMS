import { ConsoleLogger, Injectable } from '@nestjs/common';
import { formatIsoLocal } from '../dates/iso-local';

/**
 * Custom logger that prefixes messages with an ISO UTC timestamp.
 * This keeps all log timestamps consistent and easy to correlate with Docker/Portainer timestamps.
 */
@Injectable()
export class CustomLogger extends ConsoleLogger {
  constructor(context?: string) {
    super(context ?? 'Application');
  }

  /**
   * Produce an ISO-like timestamp in the process local timezone.
   * Example: 2025-10-27T23:50:00+07:00
   */
  // Use shared helper for consistent ISO-like local timestamp
  private isoLocal(): string {
    return formatIsoLocal();
  }

  log(message: any, context?: string): void {
    super.log(`${this.isoLocal()} - ${message}`, context);
  }

  error(message: any, trace?: string, context?: string): void {
    super.error(`${this.isoLocal()} - ${message}`, trace, context);
  }

  warn(message: any, context?: string): void {
    super.warn(`${this.isoLocal()} - ${message}`, context);
  }

  debug(message: any, context?: string): void {
    super.debug(`${this.isoLocal()} - ${message}`, context);
  }

  verbose(message: any, context?: string): void {
    super.verbose(`${this.isoLocal()} - ${message}`, context);
  }
}
