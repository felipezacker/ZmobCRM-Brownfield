import { describe, it, expect, vi } from 'vitest';
import {
  rateLimit,
  getClientIp,
  rateLimitResponse,
  buildRateLimitHeaders,
  type RateLimitResult,
} from '@/lib/rate-limit';
import { withRateLimit } from '@/app/api/public/v1/with-rate-limit';

/**
 * Tests use the in-memory fallback (no UPSTASH env vars in test).
 * Unique IPs per test avoid cross-test pollution.
 */

let testIpCounter = 0;
function uniqueIp(): string {
  return `test-${Date.now()}-${testIpCounter++}`;
}

// ---------------------------------------------------------------------------
// rateLimit() — now async
// ---------------------------------------------------------------------------
describe('rateLimit', () => {
  it('should allow requests under the limit', async () => {
    const ip = uniqueIp();
    const result = await rateLimit(ip);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(59);
    expect(result.reset).toBeGreaterThan(0);
  });

  it('should block after 60 requests', async () => {
    const ip = uniqueIp();
    for (let i = 0; i < 60; i++) {
      const r = await rateLimit(ip);
      expect(r.success).toBe(true);
    }
    const blocked = await rateLimit(ip);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('should reset after window expires', async () => {
    const ip = uniqueIp();

    // Exhaust the limit
    for (let i = 0; i < 60; i++) {
      await rateLimit(ip);
    }
    expect((await rateLimit(ip)).success).toBe(false);

    // Advance time past the 60s window
    vi.useFakeTimers();
    vi.advanceTimersByTime(61_000);

    const afterReset = await rateLimit(ip);
    expect(afterReset.success).toBe(true);
    expect(afterReset.remaining).toBe(59);

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// getClientIp()
// ---------------------------------------------------------------------------
describe('getClientIp', () => {
  it('should extract from x-forwarded-for', () => {
    const req = new Request('http://localhost/test', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('should extract from x-real-ip', () => {
    const req = new Request('http://localhost/test', {
      headers: { 'x-real-ip': '10.0.0.1' },
    });
    expect(getClientIp(req)).toBe('10.0.0.1');
  });

  it('should prefer x-forwarded-for over x-real-ip', () => {
    const req = new Request('http://localhost/test', {
      headers: {
        'x-forwarded-for': '1.1.1.1',
        'x-real-ip': '2.2.2.2',
      },
    });
    expect(getClientIp(req)).toBe('1.1.1.1');
  });

  it("should fallback to 'unknown'", () => {
    const req = new Request('http://localhost/test');
    expect(getClientIp(req)).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// rateLimitResponse()
// ---------------------------------------------------------------------------
describe('rateLimitResponse', () => {
  it('should return proper headers on allowed result', () => {
    const result: RateLimitResult = { success: true, remaining: 55, reset: 1700000000 };
    const headers = buildRateLimitHeaders(result, false);
    expect((headers as Record<string, string>)['X-RateLimit-Remaining']).toBe('55');
    expect((headers as Record<string, string>)['Retry-After']).toBeUndefined();
  });

  it('should return 429 on blocked', async () => {
    const result: RateLimitResult = {
      success: false,
      remaining: 0,
      reset: Math.ceil(Date.now() / 1000) + 30,
    };
    const response = rateLimitResponse(result);
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(response.headers.get('Retry-After')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// buildRateLimitHeaders()
// ---------------------------------------------------------------------------
describe('buildRateLimitHeaders', () => {
  it('should return correct header shape', () => {
    const result: RateLimitResult = { success: true, remaining: 42, reset: 1700000000 };
    const headers = buildRateLimitHeaders(result) as Record<string, string>;
    expect(headers['X-RateLimit-Limit']).toBe('60');
    expect(headers['X-RateLimit-Remaining']).toBe('42');
    expect(headers['X-RateLimit-Reset']).toBe('1700000000');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('should include Retry-After when blocked', () => {
    const futureReset = Math.ceil(Date.now() / 1000) + 30;
    const result: RateLimitResult = { success: false, remaining: 0, reset: futureReset };
    const headers = buildRateLimitHeaders(result, true) as Record<string, string>;
    expect(headers['Retry-After']).toBeDefined();
    expect(Number(headers['Retry-After'])).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// withRateLimit()
// ---------------------------------------------------------------------------
describe('withRateLimit', () => {
  it('should wrap handler and add rate limit headers', async () => {
    const ip = uniqueIp();
    const handler = vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    }));

    const wrapped = withRateLimit(handler);
    const req = new Request('http://localhost/test', {
      headers: { 'x-forwarded-for': ip },
    });

    const response = await (wrapped as (r: Request) => Promise<Response>)(req);
    expect(response.status).toBe(200);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('60');
    expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('should return 429 when rate limited', async () => {
    const ip = uniqueIp();
    const handler = vi.fn(async () => new Response('ok'));
    const wrapped = withRateLimit(handler);

    // Exhaust limit
    for (let i = 0; i < 60; i++) {
      await rateLimit(ip);
    }

    const req = new Request('http://localhost/test', {
      headers: { 'x-forwarded-for': ip },
    });
    const response = await (wrapped as (r: Request) => Promise<Response>)(req);
    expect(response.status).toBe(429);
    expect(handler).not.toHaveBeenCalled();
  });
});
