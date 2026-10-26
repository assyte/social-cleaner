import { deleteAccountRoute } from "@/server/api/account-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = deleteAccountRoute;
