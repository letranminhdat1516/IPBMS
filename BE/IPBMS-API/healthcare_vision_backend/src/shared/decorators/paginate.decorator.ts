import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PaginateOptions } from '../../core/types/paginate.types';

type OrderDir = 'ASC' | 'DESC';

function toDir(v: unknown, fallback: OrderDir = 'DESC'): OrderDir {
  const s = String(v || '').toUpperCase();
  return s === 'ASC' || s === 'DESC' ? (s as OrderDir) : fallback;
}

function parseOrder(
  orderParam: unknown,
  orderByParam?: unknown,
  orderDirParam?: unknown,
): Record<string, OrderDir> | undefined {
  // Case 1: order as object, e.g., order[created_at]=DESC
  if (orderParam && typeof orderParam === 'object' && !Array.isArray(orderParam)) {
    const obj: Record<string, OrderDir> = {};
    for (const [k, v] of Object.entries(orderParam as Record<string, unknown>)) {
      if (k) obj[k] = toDir(v);
    }
    return Object.keys(obj).length ? obj : undefined;
  }

  // Case 2: order as string: "field:DESC,other:ASC"
  if (typeof orderParam === 'string') {
    const obj: Record<string, OrderDir> = {};
    for (const seg of orderParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)) {
      const [key, dir] = seg.split(':').map((s) => s.trim());
      if (key) obj[key] = toDir(dir);
    }
    if (Object.keys(obj).length) return obj;
  }

  // Case 3: orderBy + order
  if (orderByParam) {
    const key = String(orderByParam);
    if (key) return { [key]: toDir(orderDirParam) };
  }

  return undefined;
}

function parseWhere(whereParam: unknown): any {
  if (typeof whereParam === 'string') {
    try {
      return JSON.parse(whereParam);
    } catch {
      return whereParam; // fallback: raw string
    }
  }
  return whereParam;
}

export const Paginate = createParamDecorator(
  (ctx: ExecutionContext | undefined): PaginateOptions | undefined => {
    if (!ctx || typeof ctx.getType !== 'function' || ctx.getType() !== 'http') {
      return undefined;
    }
    const request = ctx.switchToHttp().getRequest();
    const q = request.query ?? {};
    const {
      page = '1',
      limit = '20',
      order,
      orderBy,
      orderDir,
      where,
      ...rest
    } = q as Record<string, unknown>;

    const MAX_LIMIT = 100;
    const pNum = Number(page);
    const lNum = Number(limit);
    const safePage = Number.isFinite(pNum) && pNum > 0 ? Math.floor(pNum) : 1;
    const safeLimitBase = Number.isFinite(lNum) && lNum > 0 ? Math.floor(lNum) : 20;
    const safeLimit = Math.min(safeLimitBase, MAX_LIMIT);

    const parsed: PaginateOptions = {
      page: safePage,
      limit: safeLimit,
      order: parseOrder(order, orderBy, orderDir),
      where: parseWhere(where),
    };

    // Attach remaining query keys for downstream usage (filters, etc.)
    return { ...rest, ...parsed } as PaginateOptions;
  },
);
