/**
 * withRateLimit — wraps a Next.js App Router route handler with IP-based
 * rate limiting. Applies to all public API v1 handlers.
 *
 * Usage (no dynamic params):
 *   export const GET = withRateLimit(async (request) => { ... });
 *
 * Usage (with dynamic params):
 *   export const GET = withRateLimit(
 *     async (request, ctx: { params: Promise<{ id: string }> }) => { ... }
 *   );
 */

import { NextResponse } from 'next/server';
import {
  buildRateLimitHeaders,
  getClientIp,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rate-limit';

type AnyContext = Record<string, unknown> | undefined;

type RouteHandler<TCtx extends AnyContext = undefined> = TCtx extends undefined
  ? (request: Request) => Promise<Response | NextResponse>
  : (request: Request, ctx: TCtx) => Promise<Response | NextResponse>;

/**
 * Wrap a route handler with rate limiting.
 *
 * If the caller is over the limit a 429 is returned immediately.
 * On success, X-RateLimit-* headers are appended to the handler's response.
 */
export function withRateLimit<TCtx extends AnyContext = undefined>(
  handler: RouteHandler<TCtx>,
): RouteHandler<TCtx> {
  // The overload below handles both 1-arg and 2-arg signatures uniformly.
  const wrapped = async (
    request: Request,
    ctx?: TCtx,
  ): Promise<Response | NextResponse> => {
    const ip = getClientIp(request);
    const result = await rateLimit(ip);

    if (!result.success) {
      return rateLimitResponse(result);
    }

    // Call the original handler.
    const response = ctx !== undefined
      ? await (handler as (r: Request, c: TCtx) => Promise<Response | NextResponse>)(request, ctx)
      : await (handler as (r: Request) => Promise<Response | NextResponse>)(request);

    // Append rate-limit info headers to successful responses.
    // Clone into a mutable Response to avoid mutating immutable headers (e.g. from fetch()).
    const mutableResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
    });
    const rateLimitHeaders = buildRateLimitHeaders(result);
    for (const [key, value] of Object.entries(rateLimitHeaders)) {
      // Skip Content-Type — the handler already set it.
      if (key === 'Content-Type') continue;
      mutableResponse.headers.set(key, value as string);
    }

    return mutableResponse;
  };

  return wrapped as RouteHandler<TCtx>;
}
