/**
 * Memoise an async factory. A rejected attempt is dropped from the cache so the
 * next call retries instead of replaying the same failure until the process restarts.
 */
export function lazyAsyncSingleton<T>(factory: () => Promise<T>): () => Promise<T> {
  let cached: Promise<T> | null = null;
  return () => {
    if (!cached) {
      const attempt = factory();
      cached = attempt;
      attempt.catch(() => {
        if (cached === attempt) cached = null;
      });
    }
    return cached;
  };
}
