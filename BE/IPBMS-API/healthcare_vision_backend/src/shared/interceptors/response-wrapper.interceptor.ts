import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { createSuccessResponse, createPaginatedResponse } from '../utils/common.utils';

@Injectable()
export class ResponseWrapperInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Skip wrapping if response is already wrapped (e.g., from services that manually wrap)
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Handle paginated responses
        if (data && typeof data === 'object' && 'data' in data && 'pagination' in data) {
          return createPaginatedResponse(data.data, data.pagination, 'Data retrieved successfully');
        }

        // Handle array responses (like user lists)
        if (Array.isArray(data)) {
          return createSuccessResponse(data, 'Data retrieved successfully');
        }

        // Handle single object responses
        if (data && typeof data === 'object') {
          return createSuccessResponse(data, 'Operation successful');
        }

        // Handle primitive responses
        return createSuccessResponse(data, 'Operation successful');
      }),
    );
  }
}
