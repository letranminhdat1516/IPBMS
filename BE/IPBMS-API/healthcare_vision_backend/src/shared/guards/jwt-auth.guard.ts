import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Allow OPTIONS requests for CORS preflight
    if (method === 'OPTIONS') {
      return true;
    }

    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    if (isPublic) return true;

    // Log a small preview of the Authorization header to help diagnose 401s.
    try {
      const req = context.switchToHttp().getRequest();
      const authHeader = req?.headers?.authorization || req?.headers?.Authorization;
      const preview = authHeader ? String(authHeader).slice(0, 60) : 'none';
      this.logger.debug(`Authorization header preview: ${preview}`);
    } catch (e) {
      this.logger.debug('Unable to read Authorization header preview');
    }

    // Delegate actual authentication to the passport guard
    return super.canActivate(context);
  }

  // Override handleRequest to log details when authentication fails while preserving default behavior
  handleRequest(err: any, user: any, info: any, context: ExecutionContext, status?: any) {
    if (err) this.logger.debug(`Auth error: ${err}`);
    if (!user) {
      try {
        const infoMsg = info && info.message ? info.message : JSON.stringify(info);
        this.logger.debug(`Authentication failed - user missing. info: ${infoMsg}`);
      } catch (e) {
        this.logger.debug('Authentication failed - user missing. (could not stringify info)');
      }
    }

    return super.handleRequest(err, user, info, context, status);
  }
}
