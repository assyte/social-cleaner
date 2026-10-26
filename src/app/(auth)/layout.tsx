import { redirectIfAuthenticated } from "@/server/auth/current";
import { BrandLogo } from "@/components/brand";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  await redirectIfAuthenticated();
  return (
  <main className="grid-bg flex min-h-screen items-center justify-center px-4 py-10">
  <div className="w-full max-w-md">
  <div className="mb-6 flex justify-center">
  <BrandLogo href="/" size={42} subtitle="digital footprint cleanup" />
  </div>
  {children}
  <p className="mt-6 text-center text-xs leading-relaxed text-muted">
  This system only uses public sources and the data you provide.
  <br />
  Researching another person&apos;s identity is prohibited.
  </p>
  </div>
  </main>
  );
}
