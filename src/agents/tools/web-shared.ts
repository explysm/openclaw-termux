export type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  insertedAt: number;
};

export const DEFAULT_TIMEOUT_SECONDS = 30;
export const DEFAULT_CACHE_TTL_MINUTES = 15;
const DEFAULT_CACHE_MAX_ENTRIES = 100;

export function resolveTimeoutSeconds(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(1, Math.floor(parsed));
}

export function resolveCacheTtlMs(value: unknown, fallbackMinutes: number): number {
  const minutes =
    typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : fallbackMinutes;
  return Math.round(minutes * 60_000);
}

export function normalizeCacheKey(value: string): string {
  return value.trim().toLowerCase();
}

export function readCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
): { value: T; cached: boolean } | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return { value: entry.value, cached: true };
}

export function writeCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number,
) {
  if (ttlMs <= 0) return;
  if (cache.size >= DEFAULT_CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
    insertedAt: Date.now(),
  });
}

export function withTimeout(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  if (timeoutMs <= 0) return signal ?? new AbortController().signal;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        controller.abort();
      },
      { once: true },
    );
  }
  controller.signal.addEventListener(
    "abort",
    () => {
      clearTimeout(timer);
    },
    { once: true },
  );
  return controller.signal;
}

export async function readResponseText(res: Response, maxBytes?: number): Promise<string> {
  if (maxBytes === undefined) {
    try {
      return await res.text();
    } catch {
      return "";
    }
  }

  const body = res.body;
  if (!body) return "";

  // @ts-ignore - ReadableStream might not have getReader in all environments but present in Node 22
  const reader = typeof body.getReader === "function" ? body.getReader() : null;
  if (!reader) {
    try {
      const text = await res.text();
      return text.slice(0, maxBytes);
    } catch {
      return "";
    }
  }

  let totalBytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (totalBytes < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        const remaining = maxBytes - totalBytes;
        if (value.length > remaining) {
          chunks.push(value.slice(0, remaining));
          totalBytes += remaining;
          void reader.cancel();
          break;
        } else {
          chunks.push(value);
          totalBytes += value.length;
        }
      }
    }
  } catch (err) {
    // ignore read errors
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks).toString("utf8");
}
