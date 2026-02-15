import { NextRequest, NextResponse } from 'next/server';

const hits = new Map<string, number[]>();

// Periodic cleanup of stale keys every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of hits) {
    const fresh = timestamps.filter((t) => t > now - 3600000);
    if (fresh.length === 0) {
      hits.delete(key);
    } else {
      hits.set(key, fresh);
    }
  }
}, 60000);

function rateLimit(key: string, limit: number, windowMs: number): { success: boolean; remaining: number; retryAfterMs: number } {
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
