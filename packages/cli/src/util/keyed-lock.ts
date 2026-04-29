/**
 * In-process serializing lock keyed by string. Use to prevent races where
 * concurrent workers run a non-thread-safe operation against the same
 * resource (e.g. `git worktree add` on a single repo).
 *
 * Operations against different keys still run in parallel. Only same-key
 * operations are serialized.
 */
const inFlight = new Map<string, Promise<unknown>>();

export async function withKeyedLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = inFlight.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  // Store the chained promise; clear when it settles so the map doesn't grow.
  inFlight.set(
    key,
    next.finally(() => {
      if (inFlight.get(key) === next) inFlight.delete(key);
    }),
  );
  return next;
}
