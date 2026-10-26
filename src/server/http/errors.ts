import { ZodError, type ZodType } from "zod";

export class ApiError extends Error {
 readonly status: number;
 readonly code: string;
 readonly details?: unknown;

 constructor(status: number, code: string, message: string, details?: unknown) {
 super(message);
 this.name = "ApiError";
 this.status = status;
 this.code = code;
 this.details = details;
 }
}

export function badRequest(message: string, details?: unknown): ApiError {
 return new ApiError(400, "VALIDATION_ERROR", message, details);
}

export function unauthorized(): ApiError {
 return new ApiError(401, "UNAUTHENTICATED", "No active session or the session has expired");
}

export function forbidden(code: string, message: string): ApiError {
 return new ApiError(403, code, message);
}

export function notFound(message = "Record not found"): ApiError {
 return new ApiError(404, "NOT_FOUND", message);
}

export function conflict(code: string, message: string): ApiError {
 return new ApiError(409, code, message);
}

export function unprocessable(code: string, message: string): ApiError {
 return new ApiError(422, code, message);
}

export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
 const headers = new Headers(init.headers);
 headers.set("Content-Type", "application/json; charset=utf-8");
 headers.set("Cache-Control", "no-store");
 return new Response(JSON.stringify(data), { ...init, headers });
}

export function noContent(init: ResponseInit = {}): Response {
 const headers = new Headers(init.headers);
 headers.set("Cache-Control", "no-store");
 return new Response(null, { ...init, status: 204, headers });
}

const MAX_BODY_BYTES = 64 * 1024;

export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
 const contentType = request.headers.get("content-type") ?? "";
 if (!contentType.toLowerCase().includes("application/json")) {
 throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json");
 }
 const declared = Number(request.headers.get("content-length") ?? "0");
 if (declared > MAX_BODY_BYTES) {
 throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
 }
 const text = await request.text();
 if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
 throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
 }
 let raw: unknown;
 try {
 raw = text ? JSON.parse(text) : {};
 } catch {
 throw badRequest("Invalid JSON");
 }
 const parsed = schema.safeParse(raw);
 if (!parsed.success) {
 throw new ApiError(400, "VALIDATION_ERROR", "Input validation failed", formatZodError(parsed.error));
 }
 return parsed.data;
}

export function formatZodError(error: ZodError): Array<{ path: string; message: string }> {
 return error.issues.slice(0, 20).map((issue) => ({
 path: issue.path.join(".") || "(root)",
 message: issue.message,
 }));
}

/**
 * Single error boundary for every route handler. Guarantees that no stack trace,
 * SQL fragment or secret ever reaches the client.
 */
export async function handleApi(fn: () => Promise<Response>): Promise<Response> {
 try {
 return await fn();
 } catch (error) {
 if (error instanceof ApiError) {
 const body: Record<string, unknown> = {
 error: { code: error.code, message: error.message },
 };
 if (error.details !== undefined) {
 (body.error as Record<string, unknown>).details = error.details;
 }
 return jsonResponse(body, { status: error.status });
 }
 if (error instanceof ZodError) {
 return jsonResponse(
 {
 error: {
 code: "VALIDATION_ERROR",
 message: "Input validation failed",
 details: formatZodError(error),
 },
 },
 { status: 400 },
 );
 }
 // Log the message only (no request body, no PII) and return a generic error.
 console.error("[api] unexpected error:", error instanceof Error ? error.message : "unknown");
 return jsonResponse(
 { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
 { status: 500 },
 );
 }
}

export function clientIp(request: Request): string | null {
 // Only meaningful behind a trusted proxy; hashed before storage either way.
 const forwarded = request.headers.get("x-forwarded-for");
 if (forwarded) return forwarded.split(",")[0]!.trim();
 return request.headers.get("x-real-ip");
}
