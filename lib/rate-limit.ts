import { NextRequest, NextResponse } from 'next/server';

const hits = new Map<string, number[]>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000;
const MAX_KEY_AGE_MS = 3_600_000;

/**
 * Lazy cleanup: evict stale entries inline instead of using setInterval.
 * This avoids memory leaks in serverless/edge environments where
 * module-level timers are never cleared.
 */
function lazyCleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, timestamps] of hits) {
    const fresh = timestamps.filter((t) => t > now - MAX_KEY_AGE_MS);
    if (fresh.length === 0) {
      hits.delete(key);
    } else {
      hits.set(key, fresh);
    }
  }
}

function rateLimit(key: string, limit: number, windowMs: number): { success: boolean; remaining: number; retryAfterMs: number } {
  lazyCleanup();

  const now = Date.now();
  const timestamps = hits.get(key) || [];
  const windowStart = now - windowMs;
  const recent = timestamps.filter((t) => t > windowStart);

  if (recent.length >= limit) {
    const oldestInWindow = recent[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    hits.set(key, recent);
    return { success: false, remaining: 0, retryAfterMs };
  }

  recent.push(now);
  hits.set(key, recent);
  return { success: true, remaining: limit - recent.length, retryAfterMs: 0 };
}

export function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export function checkRateLimit(
  request: NextRequest,
  key: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const result = rateLimit(key, limit, windowMs);
  if (!result.success) {
    const retryAfter = Math.ceil(result.retryAfterMs / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      }
    );
  }
  return null;
}
