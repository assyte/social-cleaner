import { auditLogRoute } from "@/server/api/account-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = auditLogRoute;
