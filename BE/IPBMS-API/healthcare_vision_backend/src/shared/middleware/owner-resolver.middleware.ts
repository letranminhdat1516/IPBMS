import { Injectable, Logger, NestMiddleware, NotFoundException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { isValidUuid } from '../utils/uuid.util';

@Injectable()
export class OwnerResolverMiddleware implements NestMiddleware {
  private readonly logger = new Logger(OwnerResolverMiddleware.name);

  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    try {
      // If customer_id already present, nothing to do
      const params: any = req.params ?? {};
      const query: any = req.query ?? {};
      const body: any = req.body ?? {};

      // Check if already resolved
      if (
        params.customer_id ||
        params.user_id ||
        params.patient_id ||
        query.customer_id ||
        body.customer_id
      ) {
        this.logger.debug('OwnerResolver: customer_id already present; skipping resolution');
      } else {
        const eventId = params.event_id || query.event_id || body.event_id || req.params?.id;
        if (!eventId || !isValidUuid(eventId)) {
          this.logger.debug('OwnerResolver: no valid event_id found; skipping resolution');
        } else {
          // Lookup event owner (user_id) from events table - select only user_id for efficiency
          const ev = await this.prisma.events.findUnique({
            where: { event_id: eventId },
            select: { user_id: true },
          });
          if (!ev) {
            // Event doesn't exist - throw 404 instead of falling back
            throw new NotFoundException(`Event with ID ${eventId} not found`);
          }
          if (!ev.user_id) {
            this.logger.warn(`OwnerResolver: event ${eventId} has no user_id (orphaned event)`);
          } else {
            // populate customer_id so SharedPermissionGuard can use it
            // For POST/PATCH/PUT requests, also set in body to ensure it's available
            (req.params as any).customer_id = ev.user_id;
            if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
              (req.body as any).customer_id = ev.user_id;
            }
            this.logger.debug(
              `OwnerResolver: set customer_id=${ev.user_id} for event=${eventId} (method=${req.method})`,
            );
          }
        }
      }
      // Success - continue to next middleware/guard
      next();
    } catch (err: any) {
      // Re-throw NotFoundException so it properly returns 404 to client
      if (err instanceof NotFoundException) {
        return next(err); // Pass error to Express error handler
      }
      // Log other unexpected errors but don't block the request
      this.logger.warn(`OwnerResolverMiddleware error: ${err?.message || err}`);
      // swallow non-critical errors - permission guard will still run and deny if needed
      next();
    }
  }
}
