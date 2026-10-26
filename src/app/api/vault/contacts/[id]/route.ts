import { deleteContactRoute } from "@/server/api/vault-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, ctx: Ctx): Promise<Response> {
 const { id } = await ctx.params;
 return deleteContactRoute(request, id);
}
