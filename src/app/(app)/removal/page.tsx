import type { Metadata } from "next";
import { requirePageSession } from "@/server/auth/current";
import { InfoPanel, PageHeader } from "@/components/ui";
import { RemovalGuide } from "@/components/removal-guide";
import { REMOVAL_GUIDES, REMOVAL_GUIDE_COUNTS } from "@/server/removal/guides";

export const metadata: Metadata = { title: "Remove Guide" };
export const dynamic = "force-dynamic";

export default async function RemovalPage() {
  await requirePageSession();
  const counts = REMOVAL_GUIDE_COUNTS;
  const categoryCount = new Set(REMOVAL_GUIDES.map((guide) => guide.category)).size;

  return (
    <>
      <PageHeader
        eyebrow="Remove Guide"
        title="Remove Guide"
        description="Platform-specific steps and official deletion links for closing or permanently deleting an account. You start every request yourself; Social Cleaner never deletes an account on your behalf."
        actions={
          <InfoPanel
            items={[
              { label: "Platforms", value: counts.total },
              { label: "Self-serve", value: counts.selfServe },
              { label: "Support or limited", value: counts.support, tone: "warn" },
              { label: "Categories", value: categoryCount },
            ]}
          />
        }
      />

      <RemovalGuide guides={REMOVAL_GUIDES} />
    </>
  );
}
