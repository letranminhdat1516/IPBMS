import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import moment from 'moment-timezone';
import { Observable, tap } from 'rxjs';
import { ActivityLogsService } from '../../application/services/activity-logs.service';
import { UsersService } from '../../application/services/users.service';
import { LOG_ACTIVITY_KEY } from '../decorators/log-activity.decorator';
@Injectable()
export class LogActivityInterceptor implements NestInterceptor {
  private logQueue: (() => Promise<void>)[] = [];
  private isProcessing = false;

  constructor(
    private _reflector: Reflector,
    private readonly _activityService: ActivityLogsService,
    private readonly _usersService: UsersService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const logOptions = this._reflector.get(LOG_ACTIVITY_KEY, context.getHandler());
    if (!logOptions) return next.handle();

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as any;
    const decoded = (request as any)['decoded'];

    return next.handle().pipe(
      tap(() => {
        this.enqueueLog(() =>
          this.writeLog(request, logOptions, {
            decoded,
            user,
          }),
        );
      }),
    );
  }

  private enqueueLog(task: () => Promise<void>) {
    this.logQueue.push(task);
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    this.isProcessing = true;
    while (this.logQueue.length > 0) {
      const task = this.logQueue.shift();
      if (task) {
        try {
          await task();
        } catch (err) {
          Logger.error(
            '⚠️ Failed to write activity log (queued):',
            String(err),
            'LogActivityInterceptor',
          );
        }
      }
    }
    this.isProcessing = false;
  }

  private async writeLog(req: Request, logOptions: any, extras: any) {
    try {
      const sanitizedBody = this.sanitizeRequestBody(req.body);

      const actorInfo = await this.resolveActorInfo(req, extras);

      const resource_id = this.resolveField(logOptions.resource_id, req, extras);
      const resource_name = this.resolveField(logOptions.resource_name, req, extras);

      await this._activityService.create({
        actor_id: actorInfo.actor_id ?? undefined,
        actor_name: actorInfo.actor_name ?? 'Unknown',
        action: logOptions.action ?? logOptions.action_enum,
        action_enum: logOptions.action_enum ?? null,
        message: logOptions.message ?? null,
        resource_type: logOptions.resource_type ?? null,
        resource_id,
        resource_name,
        severity: logOptions.severity ?? 'info',
        ip: req.ip,
        timestamp: moment().tz('Asia/Ho_Chi_Minh').toDate(),
        meta: {
          method: req.method,
          url: req.originalUrl,
          body: sanitizedBody,
          params: req.params,
          query: req.query,
        },
      });
    } catch (err) {
      Logger.error('⚠️ Error during activity logging:', String(err), 'LogActivityInterceptor');
    }
  }

  private async resolveActorInfo(
    req: Request,
    extras: any,
  ): Promise<{ actor_id?: string; actor_name?: string }> {
    const user = extras.user;
    if (user?.userId) {
      return {
        actor_id: user.userId,
        actor_name: user.full_name ?? user.username ?? 'Unknown',
      };
    }

    // Trường hợp chưa đăng nhập (đăng ký, đăng nhập, quên mật khẩu, v.v.)
    const email = req.body?.email;
    const phone = req.body?.phone_number;

    try {
      if (email) {
        const user = await this._usersService.findByEmail(email);
        if (user) {
          return {
            actor_id: user.user_id,
            actor_name: user.full_name ?? user.username ?? user.email,
          };
        }
      } else if (phone) {
        const user = await this._usersService.findByPhone(phone);
        if (user) {
          return {
            actor_id: user.user_id,
            actor_name: user.full_name ?? user.username ?? user.phone_number,
          };
        }
      }
    } catch (err) {
      Logger.error(
        '⚠️ Failed to resolve actor info from body.email/phone_number',
        String(err),
        'LogActivityInterceptor',
      );
    }

    return {};
  }

  private resolveField(expr: string | undefined, req: Request, extras: any): string | undefined {
    if (!expr) return undefined;

    if (expr.startsWith('body.')) return req.body?.[expr.slice(5)];
    if (expr.startsWith('param.')) return req.params?.[expr.slice(6)];
    if (expr.startsWith('user.')) return extras.user?.[expr.slice(5)];
    if (expr.startsWith('decoded.')) return extras.decoded?.[expr.slice(8)];
    if (expr.startsWith('literal:')) return expr.slice(8);

    if (expr.startsWith('query.')) {
      const val = req.query?.[expr.slice(6)];
      return typeof val === 'string' ? val : undefined;
    }

    return expr;
  }

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const SENSITIVE_FIELDS = ['password', 'otp_code', 'newPassword', 'confirmPassword', 'token'];
    const sanitized = { ...body };
    for (const field of SENSITIVE_FIELDS) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}
