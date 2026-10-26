import { deleteSearchRoute, getSearchRoute } from "@/server/api/search-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx): Promise<Response> {
 const { id } = await ctx.params;
 return getSearchRoute(request, id);
}

export async function DELETE(request: Request, ctx: Ctx): Promise<Response> {
 const { id } = await ctx.params;
 return deleteSearchRoute(request, id);
}
