import { loginRoute } from "@/server/api/auth-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = loginRoute;
