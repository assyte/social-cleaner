import { getSearchPlatformsRoute } from "@/server/api/search-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = getSearchPlatformsRoute;
