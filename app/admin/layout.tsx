import Link from "next/link";
import { ShieldCheck, Users, FileText, LayoutDashboard } from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";

export const metadata = {
  title: "Admin · LeadFlow",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
            >
              <ShieldCheck className="h-4 w-4 text-rose-500" />
              LeadFlow Admin
            </Link>
            <nav className="flex items-center gap-1 text-sm text-slate-600">
              <NavLink href="/admin" label="總覽" icon={LayoutDashboard} />
              <NavLink href="/admin/users" label="用戶" icon={Users} />
              <NavLink href="/admin/beta" label="Beta 申請" icon={FileText} />
            </nav>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-sm text-slate-500 hover:text-slate-900"
            >
              登出
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Users;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-slate-100 hover:text-slate-900"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
