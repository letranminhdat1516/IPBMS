import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Emit an event and wait for async listeners but with a timeout.
 * Throws if emitter.emitAsync rejects or timeout is reached.
 */
export type SafeEmitOptions = {
  timeoutMs?: number;
  /**
   * If true the helper will re-throw listener errors or timeout; otherwise it will reject and
   * leave handling to caller.
   */
  throwOnError?: boolean;
};

export async function safeEmitAsync(
  emitter: EventEmitter2,
  eventName: string,
  args: unknown[] = [],
  opts: SafeEmitOptions = {},
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? 2000;
  const throwOnError = opts.throwOnError ?? false;

  // Call emitter.emitAsync and race with timeout
  const emitPromise = (emitter as any).emitAsync(eventName, ...args) as Promise<any>;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Event ${eventName} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    ),
  );

  try {
    await Promise.race([emitPromise, timeoutPromise]);
  } catch (err) {
    if (throwOnError) throw err;
    // otherwise rethrow will be handled by caller's try/catch if desired
    throw err;
  }
}
