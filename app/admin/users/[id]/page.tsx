import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminUserDetail } from "@/lib/admin/queries";
import { formatDate, formatRelative } from "@/lib/utils";
import { EditNameForm } from "./edit-name-form";
import { EditAgentProfileForm } from "./edit-agent-profile-form";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const u = await getAdminUserDetail(params.id);
  if (!u) notFound();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          回到用戶列表
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold text-slate-900">
            {u.displayName || u.email.split("@")[0]}
          </h1>
          <p className="text-sm text-slate-500">{u.email}</p>

          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              基本資料
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <EditNameForm userId={u.id} initialName={u.displayName ?? ""} />
              <Field label="電話" value={u.phone ?? "—"} />
              <Field label="註冊時間" value={u.createdAt ? formatDate(u.createdAt) : "—"} />
              <Field
                label="最後登入"
                value={u.lastSignInAt ? formatRelative(u.lastSignInAt) : "—"}
              />
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              LeadFlow 個人資料（客戶看到的）
            </p>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
              {u.agentProfile ? (
                <>
                  <p className="mb-3 text-xs text-slate-500">
                    短碼：
                    <span className="font-mono text-slate-700">
                      {u.agentProfile.shortCode}
                    </span>{" "}
                    · 連結 /r/{u.agentProfile.shortCode}
                  </p>
                  <EditAgentProfileForm
                    userId={u.id}
                    initial={{
                      displayName: u.agentProfile.displayName,
                      phone: u.agentProfile.phone,
                      bio: u.agentProfile.bio,
                      photoUrl: u.agentProfile.photoUrl ?? "",
                      lineId: u.agentProfile.lineId,
                    }}
                  />
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  此用戶尚無 agent_profiles 資料。
                </p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              LINE 綁定
            </p>
            <div className="mt-3">
              {u.lineUserId ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  已綁定 · userId: <span className="font-mono text-xs">{u.lineUserId}</span>
                  <br />
                  綁定時間 {u.lineBoundAt ? formatRelative(u.lineBoundAt) : "—"}
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  尚未綁定 LINE
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              使用量
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Count label="客戶" value={u.clientCount} />
              <Count label="物件" value={u.propertyCount} />
              <Count label="提醒" value={u.reminderCount} />
            </div>
          </div>

          {u.betaApplication && (
            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Beta 申請資料
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="申請姓名" value={u.betaApplication.name ?? "—"} />
                <Field label="任職房仲" value={u.betaApplication.agency ?? "—"} />
                <Field
                  label="月處理客戶"
                  value={u.betaApplication.monthlyClients ?? "—"}
                />
                <Field
                  label="申請時間"
                  value={
                    u.betaApplication.appliedAt
                      ? formatRelative(u.betaApplication.appliedAt)
                      : "—"
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/40 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
