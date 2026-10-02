import { headers } from "next/headers";

// ponytail: in-memory fixed window per process. Correct for one server; move to Redis/Upstash
// (same signature) before running more than one instance.
const buckets = new Map<string, { count: number; resetAt: number }>();

/** Returns true when the call is allowed, false when `key` has used up `limit` calls in `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

/**
 * Best-effort client address. The leftmost X-Forwarded-For entry is whatever the client sent,
 * so prefer the proxy-set X-Real-IP, then the entry the nearest proxy appended (the last one).
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "local";
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
