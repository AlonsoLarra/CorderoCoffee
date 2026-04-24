/**
 * Rate limiter with Upstash Redis backend for multi-instance deployments (Vercel).
 * Falls back to in-memory when UPSTASH_REDIS_REST_URL is not set (local dev).
 *
 * Setup: add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your env vars.
 * Free tier at https://upstash.com is sufficient for most workloads.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Shared result type (used by both implementations)
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

// ---------------------------------------------------------------------------
// In-memory fallback (local dev / missing env vars)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      memoryStore.forEach((entry, key) => {
        if (now - entry.windowStart > 60_000 * 5) {
          memoryStore.delete(key);
        }
      });
    },
    60_000 * 5,
  );
}

function checkMemoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    memoryStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, resetInMs: windowMs };
  }

  entry.count += 1;
  const resetInMs = windowMs - (now - entry.windowStart);

  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetInMs };
  }

  return { allowed: true, remaining: limit - entry.count, resetInMs };
}

// ---------------------------------------------------------------------------
// Upstash Redis limiter (production)
// ---------------------------------------------------------------------------

// Cache Ratelimit instances so we don't reconstruct them on every request.
const redisLimiters = new Map<string, Ratelimit>();

function getRedisLimiter(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  const existing = redisLimiters.get(cacheKey);
  if (existing) return existing;

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
    prefix: "rl",
  });

  redisLimiters.set(cacheKey, limiter);
  return limiter;
}

async function checkRedisRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const limiter = getRedisLimiter(limit, windowMs);
  const { success, remaining, reset } = await limiter.limit(key);
  const resetInMs = Math.max(0, reset - Date.now());
  return { allowed: success, remaining, resetInMs };
}

// ---------------------------------------------------------------------------
// Public API — async, transparent switch between backends
// ---------------------------------------------------------------------------

const redisConfigured =
  typeof process.env.UPSTASH_REDIS_REST_URL === "string" &&
  process.env.UPSTASH_REDIS_REST_URL.length > 0 &&
  typeof process.env.UPSTASH_REDIS_REST_TOKEN === "string" &&
  process.env.UPSTASH_REDIS_REST_TOKEN.length > 0;

/**
 * Check if a request from `key` is within the allowed rate.
 * Uses Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set,
 * otherwise falls back to in-memory (safe for local dev / single instance).
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (redisConfigured) {
    return checkRedisRateLimit(key, limit, windowMs);
  }
  return checkMemoryRateLimit(key, limit, windowMs);
}

/** Extract the client IP from a Next.js Request. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
