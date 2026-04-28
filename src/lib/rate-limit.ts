// In-memory sliding window rate limiter.
// Works per serverless instance — good enough for protecting against abuse
// without requiring an external Redis service.

const store = new Map<string, number[]>();

// Prune stale entries every 5 minutes to prevent unbounded memory growth
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of store.entries()) {
      const recent = timestamps.filter((t) => now - t < 120_000);
      if (recent.length === 0) store.delete(key);
      else store.set(key, recent);
    }
  }, 5 * 60_000);
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  const timestamps = (store.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    const oldest = Math.min(...timestamps);
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.ceil((oldest + windowMs - now) / 1000),
    };
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return {
    allowed: true,
    remaining: limit - timestamps.length,
    resetInSeconds: 0,
  };
}

export function rateLimitHeaders(result: RateLimitResult, limit: number) {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetInSeconds),
    ...(result.allowed ? {} : { 'Retry-After': String(result.resetInSeconds) }),
  };
}
