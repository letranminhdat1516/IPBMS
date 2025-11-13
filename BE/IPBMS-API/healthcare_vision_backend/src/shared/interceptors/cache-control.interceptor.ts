import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { CACHE_TTL_SECONDS } from '../decorators/cache-control.decorator';

@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() === 'http') {
      const handler = context.getHandler();
      const ttl = this.reflector.get<number | undefined>(CACHE_TTL_SECONDS, handler);
      if (ttl && Number.isFinite(ttl) && ttl > 0) {
        const res = context.switchToHttp().getResponse();
        try {
          res.setHeader('Cache-Control', `public, max-age=${Math.floor(ttl)}`);
        } catch {}
      }
    }
    return next.handle();
  }
}
