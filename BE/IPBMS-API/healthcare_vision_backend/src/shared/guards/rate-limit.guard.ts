import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Skip rate limiting for successful requests
  skipFailedRequests?: boolean; // Skip rate limiting for failed requests
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private requests = new Map<string, { count: number; resetTime: number }>();

  constructor(private readonly _reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const options = this.getRateLimitOptions(context);

    if (!options) {
      return true; // No rate limiting configured
    }

    const key = this.getRateLimitKey(request, context);
    const now = Date.now();
    const windowData = this.requests.get(key);

    if (!windowData || now > windowData.resetTime) {
      // First request in window or window expired
      this.requests.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return true;
    }

    if (windowData.count >= options.maxRequests) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests',
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((windowData.resetTime - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    windowData.count++;
    return true;
  }

  private getRateLimitOptions(context: ExecutionContext): RateLimitOptions | null {
    const classOptions = this._reflector.get<RateLimitOptions>('rateLimit', context.getClass());
    const methodOptions = this._reflector.get<RateLimitOptions>('rateLimit', context.getHandler());

    return methodOptions || classOptions || null;
  }

  private getRateLimitKey(request: Request, context: ExecutionContext): string {
    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;

    // Use IP address as primary key
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';

    // Include endpoint info for more granular rate limiting
    return `${ip}:${className}:${methodName}`;
  }

  // Clean up expired entries periodically
  private cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Decorators for easy configuration
export function RateLimit(options: RateLimitOptions) {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (propertyKey && descriptor) {
      // Method decorator
      Reflect.defineMetadata('rateLimit', options, descriptor.value);
    } else {
      // Class decorator
      Reflect.defineMetadata('rateLimit', options, target);
    }
  };
}

// Predefined rate limit decorators
export const StrictRateLimit = () => RateLimit({ windowMs: 60000, maxRequests: 10 }); // 10 requests per minute
export const ModerateRateLimit = () => RateLimit({ windowMs: 60000, maxRequests: 30 }); // 30 requests per minute
export const LenientRateLimit = () => RateLimit({ windowMs: 60000, maxRequests: 100 }); // 100 requests per minute
