import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UploadsService } from '../../application/services/upload/uploads.service';

@Injectable()
export class AttachmentResolveInterceptor implements NestInterceptor {
  constructor(private readonly _uploadsService: UploadsService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const body = req.body || {};

    if (body.attachments && Array.isArray(body.attachments) && body.attachments.length > 0) {
      const resolved = await Promise.all(
        body.attachments.map(async (a: any) => {
          if (!a || !a.file_id) {
            throw new BadRequestException('Each attachment must include file_id');
          }
          // Allow legacy/non-UUID file ids (e.g., 'file-1') for backward compatibility.
          // Do not validate strictly as UUID here because tests and legacy uploads
          // may use custom identifiers.
          try {
            const up = await this._uploadsService.getUploadById(a.file_id);
            // ownership check: upload.user_id must match caller unless caller is admin
            const isAdmin = user?.role === 'admin';
            if (!isAdmin && up.user_id !== user?.userId) {
              throw new ForbiddenException('Attachment does not belong to the authenticated user');
            }
            return {
              file_id: a.file_id,
              file_name: up.filename || a.file_name,
              file_url: up.url || a.file_url,
              file_size: up.size || a.file_size,
              mime_type: up.mime || a.mime_type,
              description: a.description || null,
            };
          } catch (err: any) {
            // Re-throw known exceptions, wrap unknown as BadRequest
            if (err instanceof ForbiddenException) throw err;
            if (err.message && err.message.includes('not found')) {
              throw new BadRequestException(`Upload not found: ${a.file_id}`);
            }
            throw new BadRequestException(`Invalid attachment: ${a.file_id}`);
          }
        }),
      );

      body.metadata = Object.assign({}, body.metadata || {}, { attachments: resolved });
      delete body.attachments;
      req.body = body;
    }

    return next.handle();
  }

  private isUuid(value: string): boolean {
    if (!value || typeof value !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value.trim());
  }
}
