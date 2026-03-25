/**
 * Simple in-memory rate limiter.
 * Resets per window; suitable for single-instance deployments (Vercel serverless).
 * For multi-instance setups, replace with a Redis-backed solution.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      store.forEach((entry, key) => {
        if (now - entry.windowStart > 60_000 * 5) {
          store.delete(key);
        }
      });
    },
    60_000 * 5,
  );
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

/**
 * Check if a request from `key` (typically an IP address) is within the limit.
 * @param key     Unique identifier for the client (IP, user ID, etc.)
 * @param limit   Max requests allowed per window
 * @param windowMs Window duration in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, resetInMs: windowMs };
  }

  entry.count += 1;
  const resetInMs = windowMs - (now - entry.windowStart);

  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetInMs };
  }

  return { allowed: true, remaining: limit - entry.count, resetInMs };
}

/** Extract the client IP from a Next.js Request. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
