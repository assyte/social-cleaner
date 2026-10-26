import { createContactRoute } from "@/server/api/vault-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createContactRoute;
