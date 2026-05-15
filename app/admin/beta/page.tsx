import { Card, CardContent } from "@/components/ui/card";
import { listBetaApplications } from "@/lib/admin/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminBetaPage() {
  const rows = await listBetaApplications();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Beta 申請</h1>
        <p className="text-sm text-slate-500">共 {rows.length} 筆</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <Th>姓名</Th>
                  <Th>Email</Th>
                  <Th>電話</Th>
                  <Th>LINE ID</Th>
                  <Th>任職房仲</Th>
                  <Th>月處理</Th>
                  <Th>申請時間</Th>
                  <Th>狀態</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      尚無申請
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <Td>{r.name}</Td>
                    <Td className="text-slate-600">{r.email}</Td>
                    <Td className="text-slate-600">{r.phone ?? "—"}</Td>
                    <Td className="text-slate-600">{r.lineId ?? "—"}</Td>
                    <Td className="text-slate-600">{r.agency ?? "—"}</Td>
                    <Td className="text-slate-600">{r.monthlyClients ?? "—"}</Td>
                    <Td className="text-xs text-slate-500">
                      {r.appliedAt ? formatDate(r.appliedAt) : "—"}
                    </Td>
                    <Td>
                      {r.status === "已開通" ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          已開通
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          待審
                        </span>
                      )}
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
