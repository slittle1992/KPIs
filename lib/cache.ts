/** Tiny in-memory TTL cache. Lives for the lifetime of a serverless instance,
 *  which is enough to keep repeated dashboard loads from hammering Meta / GHL. */
const store = new Map<string, { exp: number; value: unknown }>();

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>, bypass = false): Promise<T> {
  const hit = store.get(key);
  const now = Date.now();
  if (!bypass && hit && hit.exp > now) return hit.value as T;
  const value = await fn();
  store.set(key, { exp: now + ttlMs, value });
  return value;
}
