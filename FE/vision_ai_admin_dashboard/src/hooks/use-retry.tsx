import { useCallback, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: unknown) => boolean;
}

interface UseRetryableQueryOptions<TData> extends RetryOptions {
  queryKey: unknown[];
  queryFn: () => Promise<TData>;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  retryCondition: (error: unknown) => {
    // Retry on network errors, server errors, or database connection issues
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('fetch') ||
        message.includes('network') ||
        message.includes('prepared statement') ||
        message.includes('database') ||
        message.includes('prisma') ||
        message.includes('timeout') ||
        message.includes('connection')
      );
    }
    return false;
  },
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: Required<RetryOptions>
): Promise<T> {
  let lastError: unknown;
  let delay = options.initialDelay;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've reached max attempts
      if (attempt === options.maxRetries) {
        break;
      }

      // Don't retry if the error doesn't meet retry conditions
      if (!options.retryCondition(error)) {
        break;
      }

      // Wait before retrying
      await wait(delay);

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * options.backoffFactor, options.maxDelay);
    }
  }

  throw lastError;
}

export function useRetryableQuery<TData>(options: UseRetryableQueryOptions<TData>) {
  const { queryKey, queryFn, ...retryOptions } = options;
  const mergedOptions = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };

  const query = useQuery({
    queryKey,
    queryFn: () => retryWithBackoff(queryFn, mergedOptions),
    enabled: options.enabled,
    staleTime: options.staleTime,
    gcTime: options.cacheTime,
    retry: false, // We handle retries manually
  });

  return query;
}

export function useManualRetry() {
  const [isRetrying, setIsRetrying] = useState(false);
  const queryClient = useQueryClient();

  const retry = useCallback(
    async (queryKey: unknown[], queryFn: () => Promise<unknown>, options?: RetryOptions) => {
      const mergedOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
      setIsRetrying(true);

      try {
        const result = await retryWithBackoff(queryFn, mergedOptions);

        // Update the query cache with the new result
        queryClient.setQueryData(queryKey, result);

        // Invalidate the query to trigger a refetch with the updated data
        await queryClient.invalidateQueries({ queryKey });

        return result;
      } finally {
        setIsRetrying(false);
      }
    },
    [queryClient]
  );

  return { retry, isRetrying };
}

// Hook for retrying failed mutations
export function useRetryableMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: RetryOptions & {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: unknown, variables: TVariables) => void;
  }
) {
  const mergedOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };

  return useMutation({
    mutationFn: (variables: TVariables) =>
      retryWithBackoff(() => mutationFn(variables), mergedOptions),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

// Helper to determine if an error is retryable
export function isRetryableError(error: unknown): boolean {
  return DEFAULT_RETRY_OPTIONS.retryCondition(error);
}

// Hook to check if the server/database is experiencing issues
export function useServerHealthCheck() {
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [isServerUnhealthy, setIsServerUnhealthy] = useState(false);

  const recordFailure = useCallback(() => {
    setConsecutiveFailures((prev) => {
      const newCount = prev + 1;
      if (newCount >= 3) {
        setIsServerUnhealthy(true);
      }
      return newCount;
    });
  }, []);

  const recordSuccess = useCallback(() => {
    setConsecutiveFailures(0);
    setIsServerUnhealthy(false);
  }, []);

  return {
    isServerUnhealthy,
    consecutiveFailures,
    recordFailure,
    recordSuccess,
  };
}
