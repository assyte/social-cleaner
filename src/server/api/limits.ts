import { ApiError } from "@/server/http/errors";
import { clientIp } from "@/server/http/errors";
import { consume } from "@/server/auth/rate-limit";
import { sha256Hex } from "@/server/crypto/tokens";

export function enforceRateLimit(key: string, limit: number, windowMs: number): void {
 const result = consume(key, limit, windowMs);
 if (!result.allowed) {
 throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please try again later.", {
 retryAfterSec: result.retryAfterSec,
 });
 }
}

export function limitByIp(request: Request, action: string, limit: number, windowMs: number): void {
 const ip = clientIp(request) ?? "unknown";
 enforceRateLimit(`ip:${action}:${sha256Hex(ip)}`, limit, windowMs);
}

export function limitByAccount(emailBidxKey: string, action: string, limit: number, windowMs: number): void {
 enforceRateLimit(`acct:${action}:${emailBidxKey}`, limit, windowMs);
}

export function limitMutation(userId: string): void {
 enforceRateLimit(`mutate:${userId}`, 120, 60_000);
}
