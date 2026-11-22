import 'server-only';
import { HttpError } from './http';

// Simple fixed-window in-memory limiter. Fine for a single Node server.
// On Vercel / multiple instances swap the body for Upstash Ratelimit; the call sites stay the same.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    return;
  }
  b.count += 1;
  if (b.count > limit) {
    throw new HttpError(429, 'Too many requests, please try again later');
  }
}
