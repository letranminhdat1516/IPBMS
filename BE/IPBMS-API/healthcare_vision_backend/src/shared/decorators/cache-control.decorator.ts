import { SetMetadata, applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

// Simple metadata key for potential interceptors (if needed later)
export const CACHE_TTL_SECONDS = 'cache_ttl_seconds';

export function CacheControl(seconds: number) {
  return applyDecorators(
    SetMetadata(CACHE_TTL_SECONDS, seconds),
    ApiHeader({ name: 'Cache-Control', description: `public, max-age=${seconds}` }),
  );
}
