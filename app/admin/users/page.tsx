import Link from "next/link";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { listAdminUsers } from "@/lib/admin/queries";
import { formatRelative } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q?.trim() ?? "";
  const rows = await listAdminUsers(query || undefined);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">用戶</h1>
          <p className="text-sm text-slate-500">共 {rows.length} 筆</p>
        </div>
        <form className="relative" action="" method="get">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="搜尋姓名或 Email..."
            className="w-72 rounded-md border border-slate-300 bg-white px-9 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <Th>姓名</Th>
                  <Th>Email</Th>
                  <Th>電話</Th>
                  <Th>LINE</Th>
                  <Th>註冊</Th>
                  <Th>最後活躍</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      {query ? `找不到符合「${query}」的用戶` : "尚無用戶"}
                    </td>
                  </tr>
                )}
                {rows.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <Td>
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {u.displayName || u.email.split("@")[0]}
                      </Link>
                    </Td>
                    <Td className="text-slate-600">{u.email}</Td>
                    <Td className="text-slate-600">{u.phone ?? "—"}</Td>
                    <Td>
                      {u.lineUserId ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                          已綁定
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">未綁定</span>
                      )}
                    </Td>
                    <Td className="text-xs text-slate-500">
                      {u.createdAt ? formatRelative(u.createdAt) : "—"}
                    </Td>
                    <Td className="text-xs text-slate-500">
                      {u.lastSignInAt ? formatRelative(u.lastSignInAt) : "—"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-left font-medium">{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
