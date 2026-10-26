type Bucket = { count: number; resetAt: number };

/**
 * In-process fixed-window limiter.
 *
 * Limitation (documented in ADR-009): state is per process, so a multi-instance
 * deployment needs Redis. For v1 (single instance) this still stops credential
 * stuffing and accidental infinite loops.
 */
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 20_000;

export type RateLimitResult = {
 allowed: boolean;
 remaining: number;
 retryAfterSec: number;
};

export function consume(key: string, limit: number, windowMs: number): RateLimitResult {
 const now = Date.now();
 if (buckets.size > MAX_BUCKETS) sweep(now);

 let bucket = buckets.get(key);
 if (!bucket || bucket.resetAt <= now) {
 bucket = { count: 0, resetAt: now + windowMs };
 buckets.set(key, bucket);
 }
 bucket.count += 1;

 const allowed = bucket.count <= limit;
 return {
 allowed,
 remaining: Math.max(0, limit - bucket.count),
 retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
 };
}

function sweep(now: number): void {
 for (const [key, bucket] of buckets) {
 if (bucket.resetAt <= now) buckets.delete(key);
 }
}

/** Test-only. */
export function resetRateLimits(): void {
 buckets.clear();
}
