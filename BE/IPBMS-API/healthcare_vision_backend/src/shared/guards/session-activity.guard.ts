import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TRACK_SESSION_ACTIVITY } from '../decorators/track-session-activity.decorator';
import { SessionService } from '../../application/services/session.service';

@Injectable()
export class SessionActivityGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const trackActivity = this.reflector.get<boolean>(TRACK_SESSION_ACTIVITY, context.getHandler());

    if (!trackActivity) {
      return true; // Skip session activity tracking
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If user is authenticated and has a session ID in JWT payload
    if (user && user.sessionId) {
      await this.sessionService.updateSessionActivity(user.sessionId);
    }

    return true; // Always allow the request to proceed
  }
}
