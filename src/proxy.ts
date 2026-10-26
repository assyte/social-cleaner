import { NextResponse, type NextRequest } from "next/server";

const isDev = process.env.NODE_ENV !== "production";

function createNonce(): string {
 const bytes = new Uint8Array(16);
 crypto.getRandomValues(bytes);
 let binary = "";
 for (const byte of bytes) binary += String.fromCharCode(byte);
 return btoa(binary);
}

/**
 * Nonce-based CSP. Next.js reads the `Content-Security-Policy` request header to
 * attach the nonce to its own script tags, so the policy must be set on both the
 * forwarded request and the response.
 *
 * `style-src 'unsafe-inline'` is required by Next's inlined critical CSS and by
 * React's style attribute usage. No remote origins are allowed anywhere.
 */
export function proxy(request: NextRequest) {
 const nonce = createNonce();

 const csp = [
 "default-src 'self'",
 `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
 "style-src 'self' 'unsafe-inline'",
 "img-src 'self' data: blob:",
 "font-src 'self'",
 "connect-src 'self'",
 "object-src 'none'",
 "base-uri 'none'",
 "form-action 'self'",
 "frame-ancestors 'none'",
 ...(isDev ? [] : ["upgrade-insecure-requests"]),
 ].join("; ");

 const requestHeaders = new Headers(request.headers);
 requestHeaders.set("x-nonce", nonce);
 requestHeaders.set("Content-Security-Policy", csp);

 const response = NextResponse.next({ request: { headers: requestHeaders } });
 response.headers.set("Content-Security-Policy", csp);
 return response;
}

export const config = {
 matcher: [
 /*
 * Apply to documents and API responses, skip static assets and image
 * optimisation requests where the nonce is not needed.
 */
 "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
 ],
};
