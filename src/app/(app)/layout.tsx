import { requirePageSession } from "@/server/auth/current";
import { toPublicUser } from "@/server/auth/service";
import { AppMobileHeader, AppSidebar } from "@/components/app-nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePageSession();
  const user = toPublicUser(session.user);

  return (
    <div className="min-h-screen bg-canvas">
      <AppSidebar user={user} />

      <div className="lg:pl-[236px]">
        <AppMobileHeader user={user} />
        <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
