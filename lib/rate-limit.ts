/**
 * In-memory sliding window rate limiter for the public API.
 *
 * Keyed by IP address. Stores an array of request timestamps within the
 * current window. Stale entries are pruned on a background interval and also
 * lazily on every check to keep memory bounded.
 *
 * Default: 60 requests per 60-second window per IP.
 */

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60;  // requests per window

// Map<ip, timestamps[]>
const store = new Map<string, number[]>();

// Periodic cleanup — remove IPs whose last request is older than the window.
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of store.entries()) {
    const valid = timestamps.filter((t) => now - t < WINDOW_MS);
    if (valid.length === 0) {
      store.delete(ip);
    } else {
      store.set(ip, valid);
    }
  }
}, WINDOW_MS);

// Prevent the interval from keeping Node alive in test/serverless environments.
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

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
 * Performs a lazy prune of expired timestamps on every call.
 */
export function rateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Max-size guard: if the store grows beyond 10 000 keys (e.g. during a
  // distributed attack with many spoofed IPs), clear it entirely to prevent
  // unbounded memory growth. This is a simple but effective safeguard for an
  // in-memory store; at worst legitimate clients get one extra window of requests.
  if (store.size > 10_000) {
    store.clear();
  }

  // Lazy prune: keep only timestamps within the current window.
  const prev = store.get(ip) ?? [];
  const valid = prev.filter((t) => t > windowStart);

  if (valid.length >= MAX_REQUESTS) {
    // Oldest timestamp determines when the window resets for this IP.
    const oldestInWindow = valid[0];
    const reset = Math.ceil((oldestInWindow + WINDOW_MS) / 1000);
    store.set(ip, valid);
    return { success: false, remaining: 0, reset };
  }

  valid.push(now);
  store.set(ip, valid);

  const reset = Math.ceil((now + WINDOW_MS) / 1000);
  return {
    success: true,
    remaining: MAX_REQUESTS - valid.length,
    reset,
  };
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

  // When no IP can be determined, all such requests share a single rate-limit
  // bucket keyed by 'unknown'. This means one unidentifiable client hitting the
  // limit will block all other unidentifiable clients for the remainder of the
  // window. In practice this only happens in local/test environments since
  // production reverse proxies always set x-forwarded-for or x-real-ip.
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
