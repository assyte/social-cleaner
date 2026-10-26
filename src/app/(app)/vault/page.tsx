import type { Metadata } from "next";
import { requirePageSession } from "@/server/auth/current";
import { getVault } from "@/server/vault/service";
import { VaultWorkspace } from "@/components/vault-workspace";

export const metadata: Metadata = { title: "Identity Vault" };
export const dynamic = "force-dynamic";

export default async function VaultPage() {
 const session = await requirePageSession();
 const vault = await getVault(session.user.id);
 return <VaultWorkspace vault={vault} />;
}
