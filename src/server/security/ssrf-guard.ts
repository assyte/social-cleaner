import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Egress guard for every outbound fetch (Phase 2 crawler, Phase 4 verification).
 *
 * Why both a sync and an async entry point:
 * - `assertUrlAllowed` validates everything that is decidable without network
 * access (scheme, credentials, port, literal IPs, internal hostnames).
 * - `assertUrlAllowedWithDns` additionally resolves the hostname and rejects if
 * any record points into a private range. Callers must re-run this check on
 * every redirect hop and should connect to the resolved address (pinning) to
 * close the DNS-rebinding window.
 */

export type UnsafeUrlCode =
 | "invalid_url"
 | "bad_scheme"
 | "credentials_in_url"
 | "blocked_port"
 | "blocked_hostname"
 | "blocked_ip"
 | "dns_failure";

export class UnsafeUrlError extends Error {
 readonly code: UnsafeUrlCode;

 constructor(code: UnsafeUrlCode, message: string) {
 super(message);
 this.name = "UnsafeUrlError";
 this.code = code;
 }
}

const ALLOWED_PORTS = new Set(["", "80", "443"]);

const BLOCKED_HOST_SUFFIXES = [
 "localhost",
 ".localhost",
 ".local",
 ".localdomain",
 ".internal",
 ".intranet",
 ".lan",
 ".home.arpa",
 ".metadata",
 ".onion",
];

const BLOCKED_HOST_NAMES = new Set([
 "localhost",
 "metadata",
 "metadata.google.internal",
 "instance-data",
 "kubernetes",
 "kubernetes.default",
 "host.docker.internal",
 "gateway.docker.internal",
]);

function ipv4ToInt(ip: string): number | null {
 const parts = ip.split(".");
 if (parts.length !== 4) return null;
 let out = 0;
 for (const part of parts) {
 if (!/^\d{1,3}$/.test(part)) return null;
 const n = Number(part);
 if (n > 255) return null;
 out = (out << 8) | n;
 }
 return out >>> 0;
}

function inCidr4(value: number, base: string, bits: number): boolean {
 const baseInt = ipv4ToInt(base);
 if (baseInt === null) return false;
 const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
 return (value & mask) === (baseInt & mask);
}

const BLOCKED_V4_RANGES: Array<[string, number]> = [
 ["0.0.0.0", 8],
 ["10.0.0.0", 8],
 ["100.64.0.0", 10],
 ["127.0.0.0", 8],
 ["169.254.0.0", 16],
 ["172.16.0.0", 12],
 ["192.0.0.0", 24],
 ["192.0.2.0", 24],
 ["192.88.99.0", 24],
 ["192.168.0.0", 16],
 ["198.18.0.0", 15],
 ["198.51.100.0", 24],
 ["203.0.113.0", 24],
 ["224.0.0.0", 4],
 ["240.0.0.0", 4],
];

export function isBlockedIpv4(ip: string): boolean {
 const value = ipv4ToInt(ip);
 if (value === null) return true;
 if (value === 0xffffffff) return true;
 return BLOCKED_V4_RANGES.some(([base, bits]) => inCidr4(value, base, bits));
}

/** Expand an IPv6 address into eight 16-bit groups, or null if unparseable. */
function expandIpv6(input: string): number[] | null {
 let ip = input.toLowerCase();
 const zone = ip.indexOf("%");
 if (zone !== -1) ip = ip.slice(0, zone);
 if (ip.startsWith("[") && ip.endsWith("]")) ip = ip.slice(1, -1);
 if (!ip.includes(":")) return null;

 const lastColon = ip.lastIndexOf(":");
 const maybeV4 = ip.slice(lastColon + 1);
 if (maybeV4.includes(".")) {
 const v4 = ipv4ToInt(maybeV4);
 if (v4 === null) return null;
 const hi = ((v4 >>> 16) & 0xffff).toString(16);
 const lo = (v4 & 0xffff).toString(16);
 ip = `${ip.slice(0, lastColon + 1)}${hi}:${lo}`;
 }

 const halves = ip.split("::");
 if (halves.length > 2) return null;

 const parseGroups = (segment: string): number[] | null => {
 if (!segment) return [];
 const groups: number[] = [];
 for (const part of segment.split(":")) {
 if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
 groups.push(parseInt(part, 16));
 }
 return groups;
 };

 const head = parseGroups(halves[0]!);
 if (!head) return null;

 if (halves.length === 1) {
 return head.length === 8 ? head : null;
 }

 const rest = parseGroups(halves[1]!);
 if (!rest) return null;
 const fill = 8 - head.length - rest.length;
 if (fill < 1) return null;
 return [...head, ...Array<number>(fill).fill(0), ...rest];
}

export function isBlockedIpv6(input: string): boolean {
 const g = expandIpv6(input);
 if (!g) return true;

 const allZero = g.every((x) => x === 0);
 if (allZero) return true; // ::
 if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1

 // IPv4-mapped (::ffff:a.b.c.d)
 if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) {
 const v4 = `${g[6]! >> 8}.${g[6]! & 0xff}.${g[7]! >> 8}.${g[7]! & 0xff}`;
 return isBlockedIpv4(v4);
 }
 // IPv4-compatible (::a.b.c.d) — deprecated, still abused
 if (g.slice(0, 6).every((x) => x === 0) && !(g[6] === 0 && g[7]! <= 1)) {
 const v4 = `${g[6]! >> 8}.${g[6]! & 0xff}.${g[7]! >> 8}.${g[7]! & 0xff}`;
 return isBlockedIpv4(v4);
 }
 // 6to4 (2002:v4::/48)
 if (g[0] === 0x2002) {
 const v4 = `${g[1]! >> 8}.${g[1]! & 0xff}.${g[2]! >> 8}.${g[2]! & 0xff}`;
 return isBlockedIpv4(v4);
 }
 // NAT64 (64:ff9b::/96)
 if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) {
 const v4 = `${g[6]! >> 8}.${g[6]! & 0xff}.${g[7]! >> 8}.${g[7]! & 0xff}`;
 return isBlockedIpv4(v4);
 }
 // Teredo
 if (g[0] === 0x2001 && g[1] === 0x0000) return true;

 if ((g[0]! & 0xfe00) === 0xfc00) return true; // unique local fc00::/7
 if ((g[0]! & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
 if ((g[0]! & 0xffc0) === 0xfec0) return true; // site-local (deprecated)
 if ((g[0]! & 0xff00) === 0xff00) return true; // multicast
 if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
 return false;
}

export function isBlockedIp(ip: string): boolean {
 const family = isIP(ip);
 if (family === 4) return isBlockedIpv4(ip);
 if (family === 6) return isBlockedIpv6(ip);
 return true;
}

function isBlockedHostname(hostname: string): boolean {
 const host = hostname.toLowerCase().replace(/\.$/, "");
 if (!host) return true;
 if (BLOCKED_HOST_NAMES.has(host)) return true;
 if (BLOCKED_HOST_SUFFIXES.some((suffix) => host === suffix.replace(/^\./, "") || host.endsWith(suffix))) {
 return true;
 }
 // Single-label hostnames (intranet names) never resolve on the public internet.
 if (!host.includes(".") && isIP(host) === 0) return true;
 return false;
}

export function assertUrlAllowed(raw: string): URL {
 let url: URL;
 try {
 url = new URL(raw);
 } catch {
 throw new UnsafeUrlError("invalid_url", "Invalid URL");
 }
 if (url.protocol !== "http:" && url.protocol !== "https:") {
 throw new UnsafeUrlError("bad_scheme", "Only http and https are supported");
 }
 if (url.username || url.password) {
 throw new UnsafeUrlError("credentials_in_url", "URLs cannot contain credentials");
 }
 if (!ALLOWED_PORTS.has(url.port)) {
 throw new UnsafeUrlError("blocked_port", "Only ports 80 and 443 are allowed");
 }
 const hostname = url.hostname.replace(/^\[|\]$/g, "");
 if (isBlockedHostname(hostname)) {
 throw new UnsafeUrlError("blocked_hostname", "Access to this address is not allowed");
 }
 if (isIP(hostname) && isBlockedIp(hostname)) {
 throw new UnsafeUrlError("blocked_ip", "Access to a private or reserved IP range is not allowed");
 }
 return url;
}

export async function assertUrlAllowedWithDns(raw: string): Promise<URL> {
 const url = assertUrlAllowed(raw);
 const hostname = url.hostname.replace(/^\[|\]$/g, "");
 if (isIP(hostname)) return url;

 let records: Array<{ address: string; family: number }>;
 try {
 records = await lookup(hostname, { all: true, verbatim: true });
 } catch {
 throw new UnsafeUrlError("dns_failure", "The domain name could not be resolved");
 }
 if (records.length === 0) {
 throw new UnsafeUrlError("dns_failure", "The domain name could not be resolved");
 }
 for (const record of records) {
 if (isBlockedIp(record.address)) {
 throw new UnsafeUrlError("blocked_ip", "The domain name resolves to a private IP range");
 }
 }
 return url;
}
