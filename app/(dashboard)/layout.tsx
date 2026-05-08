import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomTabs } from "@/components/layout/bottom-tabs";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 px-4 py-6 md:px-8 pb-24 md:pb-6">{children}</main>
      </div>
      <BottomTabs />
    </div>
  );
}
