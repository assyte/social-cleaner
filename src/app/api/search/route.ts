import { createSearchRoute, listSearchesRoute } from "@/server/api/search-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = listSearchesRoute;
export const POST = createSearchRoute;
