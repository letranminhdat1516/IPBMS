import { applyDecorators, Type } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

export interface SwaggerEndpointResponse {
  status?: number;
  description?: string;
  type?: Type<unknown>;
  isArray?: boolean;
}

export interface SwaggerEndpointOptions {
  tags?: string[]; // ví dụ: ['system-config']
  bearer?: boolean; // mặc định true; đặt false cho public endpoint
  summary?: string;
  responses?: SwaggerEndpointResponse[];
}

/**
 * Giữ nguyên tag như truyền vào (cho phép dạng có dấu -)
 * Không chuẩn hoá hoa/thường, không PascalCase
 */
export function SwaggerEndpoint(options: SwaggerEndpointOptions = {}) {
  const decorators: Array<ClassDecorator | MethodDecorator> = [];

  // Tags
  if (options.tags && options.tags.length > 0) {
    decorators.push(ApiTags(...options.tags));
  }

  // Bearer (mặc định: true)
  if (options.bearer !== false) {
    decorators.push(ApiBearerAuth());
  }

  // Summary
  if (options.summary) {
    decorators.push(ApiOperation({ summary: options.summary }));
  }

  // Responses
  if (options.responses && options.responses.length > 0) {
    for (const resp of options.responses) {
      decorators.push(
        ApiResponse({
          status: resp.status ?? 200,
          description: resp.description ?? 'Thành công',
          type: resp.type,
          isArray: resp.isArray,
        }),
      );
    }
  }

  return applyDecorators(...decorators);
}
