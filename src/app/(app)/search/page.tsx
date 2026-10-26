import type { Metadata } from "next";
import { requirePageSession } from "@/server/auth/current";
import { getVault } from "@/server/vault/service";
import { planForUser, planSummary } from "@/server/billing/plans";
import { publicPlatforms } from "@/server/search/platforms";
import { searchProviderStatus } from "@/server/search/providers";
import { getSearchUsage, listSearches } from "@/server/search/service";
import { SearchWorkspace } from "@/components/search-workspace";

export const metadata: Metadata = {
  title: "Deep Search",
  description: "Trace public profiles by username or full name.",
};
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; run?: string | string[] }>;
}) {
  const session = await requirePageSession();
  const plan = planForUser(session.user);
  const [vault, usage, runs, params] = await Promise.all([
    getVault(session.user.id),
    getSearchUsage(session.user.id, plan),
    listSearches(session.user.id, plan),
    searchParams,
  ]);
  const initialQuery = typeof params.q === "string" ? params.q.slice(0, 120) : undefined;
  const initialRunId = typeof params.run === "string" ? params.run : undefined;

  return (
    <SearchWorkspace
      platforms={publicPlatforms()}
      plan={planSummary(plan)}
      usage={usage}
      provider={searchProviderStatus()}
      ownerDeclared={vault.profile.ownerDeclared}
      initialRuns={runs}
      suggestedHandles={vault.aliases.slice(0, 8).map((alias) => alias.handle)}
      initialQuery={initialQuery}
      initialRunId={initialRunId}
    />
  );
}
