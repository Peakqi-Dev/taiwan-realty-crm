import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomTabs } from "@/components/layout/bottom-tabs";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware redirects unauthenticated requests, but guard here too in case
  // matcher misses an edge case (e.g. direct nested route during dev HMR).
  if (!user) redirect("/login");

  const meta = (user.user_metadata ?? {}) as { display_name?: string };
  const displayName =
    meta.display_name?.trim() || user.email?.split("@")[0] || "業務員";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header user={{ email: user.email ?? "", displayName }} />
        <main className="flex-1 px-4 py-6 md:px-8 pb-24 md:pb-6">{children}</main>
      </div>
      <BottomTabs />
    </div>
  );
}
