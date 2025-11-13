export interface PaginateOptions {
  page?: number;
  limit?: number;
  order?: Record<string, 'ASC' | 'DESC'>;
  where?: any;
  [key: string]: any;
}

export interface PaginateResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  [key: string]: any;
}
