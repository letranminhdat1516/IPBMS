import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;

      // Map HTTP status to error codes
      switch (status) {
        case HttpStatus.BAD_REQUEST:
          code = 'VALIDATION_ERROR';
          break;
        case HttpStatus.UNAUTHORIZED:
          code = 'UNAUTHORIZED';
          break;
        case HttpStatus.FORBIDDEN:
          code = 'FORBIDDEN';
          break;
        case HttpStatus.NOT_FOUND:
          code = 'NOT_FOUND';
          break;
        case HttpStatus.CONFLICT:
          code = 'CONFLICT';
          break;
        case HttpStatus.TOO_MANY_REQUESTS:
          code = 'RATE_LIMIT_EXCEEDED';
          break;
        default:
          code = 'INTERNAL_ERROR';
      }
    }

    // Log error details
    this.logger.error(`HTTP ${status} Error: ${message}`, {
      path: request.url,
      method: request.method,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    // Translate common messages to Vietnamese for user-facing responses
    const translations: Record<string, string> = {
      VALIDATION_ERROR: 'Yêu cầu không hợp lệ',
      UNAUTHORIZED: 'Không được phép',
      FORBIDDEN: 'Không có quyền truy cập',
      NOT_FOUND: 'Không tìm thấy tài nguyên',
      CONFLICT: 'Xung đột dữ liệu',
      RATE_LIMIT_EXCEEDED: 'Quá nhiều yêu cầu',
      INTERNAL_ERROR: 'Lỗi máy chủ nội bộ',
    };

    // If exception provides a more specific message object, prefer that but translate common phrases
    let userMessage = message;
    // Handle array/validation message formats
    if (Array.isArray(message)) {
      userMessage = message.join('; ');
    }

    // If message is a simple known English phrase, map it to Vietnamese
    const normalized = (userMessage || '').toString();
    if (!normalized.match(/[\u4e00-\u9fff\u0100-\u017F\p{L}]/u)) {
      // If message looks like default English text and we have a translation for the code, use it
      userMessage = translations[code] || userMessage;
    } else {
      // Always map by code as a fallback
      userMessage = translations[code] || userMessage;
    }

    // Send formatted error response matching documentation (Vietnamese messages)
    const errorResponse = {
      success: false,
      error: {
        code,
        message: userMessage,
        details: exception instanceof Error ? { stack: exception.stack } : undefined,
      },
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }
}
