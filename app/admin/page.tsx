import {
  Activity,
  Building2,
  Calendar,
  MessageSquare,
  UserCheck,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminOverview } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const o = await getAdminOverview();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">總覽</h1>
        <p className="text-sm text-slate-500">系統運作即時數據</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat title="總用戶數" value={o.totalUsers} icon={Users} accent="blue" />
        <Stat
          title="Beta 申請數"
          value={o.betaApplications}
          icon={UserCheck}
          accent="emerald"
        />
        <Stat
          title="LINE 綁定數"
          value={o.lineBindings}
          icon={MessageSquare}
          accent="purple"
        />
        <Stat
          title="本週新增用戶"
          value={o.usersThisWeek}
          icon={Calendar}
          accent="amber"
        />
        <Stat
          title="本週新增客戶（全站）"
          value={o.clientsThisWeek}
          icon={Building2}
          accent="rose"
        />
        <Stat
          title="活躍用戶數（7d）"
          value={o.activeUsers}
          icon={Activity}
          accent="sky"
          hint="7 天內有登入紀錄"
        />
      </div>
    </div>
  );
}

const ACCENTS: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  purple: "bg-purple-50 text-purple-700 border-purple-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  rose: "bg-rose-50 text-rose-700 border-rose-100",
  sky: "bg-sky-50 text-sky-700 border-sky-100",
};

function Stat({
  title,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  title: string;
  value: number;
  hint?: string;
  icon: typeof Users;
  accent: keyof typeof ACCENTS;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-4">
        <div>
          <p className="text-xs text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg border ${ACCENTS[accent]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
