/**
 * Distributed sliding window rate limiter for the public API.
 *
 * Uses Upstash Redis (@upstash/ratelimit) in production for shared state
 * across serverless instances. Falls back to in-memory for dev/test when
 * UPSTASH env vars are not set.
 *
 * Default: 60 requests per 60-second window per IP.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60;  // requests per window

// ---------------------------------------------------------------------------
// Upstash distributed limiter (production)
// ---------------------------------------------------------------------------

const upstashLimiter = (() => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(MAX_REQUESTS, '60 s'),
      prefix: 'rl:api',
    });
  }
  return null;
})();

// ---------------------------------------------------------------------------
// In-memory fallback (dev/test only — NOT shared across instances)
// ---------------------------------------------------------------------------

const memStore = new Map<string, number[]>();

function memoryRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  if (memStore.size > 10_000) memStore.clear();

  const prev = memStore.get(ip) ?? [];
  const valid = prev.filter((t) => t > windowStart);

  if (valid.length >= MAX_REQUESTS) {
    const oldestInWindow = valid[0];
    const reset = Math.ceil((oldestInWindow + WINDOW_MS) / 1000);
    memStore.set(ip, valid);
    return { success: false, remaining: 0, reset };
  }

  valid.push(now);
  memStore.set(ip, valid);

  const reset = Math.ceil((now + WINDOW_MS) / 1000);
  return { success: true, remaining: MAX_REQUESTS - valid.length, reset };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  /** true when the request is within the allowed limit */
  success: boolean;
  /** number of requests remaining in the current window */
  remaining: number;
  /** Unix timestamp (seconds) when the window resets */
  reset: number;
}

/**
 * Check and record a request for the given IP.
 * Uses Upstash Redis when configured, in-memory fallback otherwise.
 */
export async function rateLimit(ip: string): Promise<RateLimitResult> {
  if (upstashLimiter) {
    const result = await upstashLimiter.limit(ip);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: Math.ceil(result.reset / 1000),
    };
  }
  return memoryRateLimit(ip);
}

/**
 * Extract the client IP from a Next.js / Node.js Request.
 * Respects x-forwarded-for (first entry) and x-real-ip headers.
 * Falls back to a constant when no IP can be determined (e.g. tests).
 *
 * **Trusted proxy assumption:** This function trusts the `x-forwarded-for` and
 * `x-real-ip` headers as set by the upstream reverse proxy (Vercel, Cloudflare,
 * nginx, etc.). Those platforms strip or overwrite client-supplied values for
 * these headers, making them safe to trust. If you self-host this application,
 * ensure your reverse proxy overwrites these headers so that clients cannot
 * spoof their IP to bypass rate limiting.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}

/**
 * Build a 429 Too Many Requests Response with standard rate-limit headers.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please slow down.',
      code: 'RATE_LIMIT_EXCEEDED',
    }),
    {
      status: 429,
      headers: buildRateLimitHeaders(result, true),
    },
  );
}

/**
 * Build the standard rate-limit response headers.
 * Set `isBlocked` to true when the request was rejected (adds Retry-After).
 */
export function buildRateLimitHeaders(
  result: RateLimitResult,
  isBlocked = false,
): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-RateLimit-Limit': String(MAX_REQUESTS),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  };

  if (isBlocked) {
    const retryAfter = Math.max(1, result.reset - Math.floor(Date.now() / 1000));
    headers['Retry-After'] = String(retryAfter);
  }

  return headers;
}
