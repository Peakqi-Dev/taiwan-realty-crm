"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { NAV_ITEMS } from "./nav-config";
import { useReminders } from "@/hooks/use-reminders";
import { UserMenu } from "./user-menu";

function pageTitleFor(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  const match = NAV_ITEMS.find(
    (item) => item.href !== "/" && pathname.startsWith(item.href),
  );
  return match?.label ?? "LeadFlow AI 業務助手";
}

interface HeaderProps {
  user: { email: string; displayName: string };
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const reminders = useReminders();
  const pendingCount = reminders.filter((r) => !r.isDone).length;

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        <div>
          <p className="text-xs text-slate-500">LeadFlow AI 業務助手</p>
          <h1 className="text-lg font-semibold text-slate-900">
            {pageTitleFor(pathname)}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
            aria-label="提醒事項"
          >
            <Bell className="h-5 w-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                {pendingCount}
              </span>
            )}
          </button>

          <UserMenu email={user.email} displayName={user.displayName} />
        </div>
      </div>
    </header>
  );
}
