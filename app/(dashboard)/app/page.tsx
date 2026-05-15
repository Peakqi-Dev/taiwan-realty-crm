"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Bell,
  Building2,
  CalendarClock,
  MessageSquare,
  Phone,
  Plus,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReminderItem } from "@/components/reminders/reminder-item";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { useProperties, usePropertyStore } from "@/hooks/use-properties";
import { useClients, useClientStore } from "@/hooks/use-clients";
import { useReminders, useReminderStore } from "@/hooks/use-reminders";
import { useInteractions } from "@/hooks/use-interactions";
import { daysFromNow, formatRelative } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  hint?: string;
  icon: typeof Bell;
  accent: "blue" | "amber" | "emerald" | "rose";
}

const ACCENTS: Record<StatCardProps["accent"], string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  rose: "bg-rose-50 text-rose-700 border-rose-100",
};

function StatCard({ title, value, hint, icon: Icon, accent }: StatCardProps) {
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

function isInCurrentMonth(date: Date) {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  );
}

export default function DashboardPage() {
  const properties = useProperties();
  const clients = useClients();
  const reminders = useReminders();
  const interactions = useInteractions();

  // Initialised flags from each store; once all three are loaded and empty
  // we replace the dashboard with an onboarding card.
  const propertiesReady = usePropertyStore((s) => s.initialized);
  const clientsReady = useClientStore((s) => s.initialized);
  const remindersReady = useReminderStore((s) => s.initialized);
  const allReady = propertiesReady && clientsReady && remindersReady;
  const allEmpty =
    properties.length === 0 && clients.length === 0 && reminders.length === 0;

  const stats = useMemo(() => {
    const showingsThisMonth = interactions.filter(
      (i) => i.type === "帶看" && isInCurrentMonth(i.createdAt),
    ).length;
    const activeProperties = properties.filter((p) => p.status === "委託中").length;
    const newClientsThisMonth = clients.filter((c) =>
      isInCurrentMonth(c.createdAt),
    ).length;
    const expiringSoon = properties.filter((p) => {
      if (p.status === "成交" || p.status === "解除委託") return false;
      const days = daysFromNow(p.commissionDeadline);
      return days >= 0 && days <= 7;
    }).length;
    return { showingsThisMonth, activeProperties, newClientsThisMonth, expiringSoon };
  }, [properties, clients, interactions]);

  const todayReminders = useMemo(() => {
    return reminders
      .filter((r) => !r.isDone)
      .filter((r) => daysFromNow(r.remindAt) <= 0)
      .sort((a, b) => a.remindAt.getTime() - b.remindAt.getTime())
      .slice(0, 5);
  }, [reminders]);

  const recentClients = useMemo(() => {
    return [...clients]
      .sort((a, b) => b.lastContactAt.getTime() - a.lastContactAt.getTime())
      .slice(0, 5);
  }, [clients]);

  if (allReady && allEmpty) return <OnboardingCard />;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="本月帶看次數"
          value={stats.showingsThisMonth}
          hint="所有 帶看 互動紀錄"
          icon={TrendingUp}
          accent="blue"
        />
        <StatCard
          title="委託中物件數"
          value={stats.activeProperties}
          hint="狀態為「委託中」"
          icon={Building2}
          accent="amber"
        />
        <StatCard
          title="本月新增客戶"
          value={stats.newClientsThisMonth}
          hint="本月建檔"
          icon={UserPlus}
          accent="emerald"
        />
        <StatCard
          title="7 天內到期委託"
          value={stats.expiringSoon}
          hint="需提早溝通續約"
          icon={CalendarClock}
          accent="rose"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-slate-600" />
                <h2 className="font-semibold text-slate-900">今日提醒</h2>
              </div>
              <Link
                href="/reminders"
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                查看全部
              </Link>
            </div>
            {todayReminders.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-500">
                今天沒有待辦提醒,休息一下吧 ☕
              </p>
            ) : (
              <div className="space-y-2">
                {todayReminders.map((r) => (
                  <ReminderItem key={r.id} reminder={r} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-600" />
                <h2 className="font-semibold text-slate-900">近期互動客戶</h2>
              </div>
              <Link
                href="/clients"
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                查看全部
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recentClients.map((c) => (
                <Link
                  key={c.id}
                  href={`/clients/${c.id}`}
                  className="flex items-center justify-between py-3 hover:bg-slate-50/60"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{c.name}</p>
                      <ClientStatusBadge status={c.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {c.type} · {c.phone}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatRelative(c.lastContactAt)}
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OnboardingCard() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardContent className="p-8 sm:p-10">
          <div className="flex flex-col items-start gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              <MessageSquare className="h-3 w-3" />
              第一次使用
            </span>
            <h1 className="text-2xl font-bold text-slate-900">
              👋 歡迎使用 LeadFlow！
            </h1>
            <p className="text-sm text-slate-500">
              三步開始，把客戶建檔交給 AI 助手。
            </p>
          </div>

          <ol className="mt-6 space-y-3 text-sm text-slate-700">
            <Step
              n="1"
              title="回 LINE 跟助手講一句話"
              body={
                <>
                  例如：<span className="font-medium">「王先生 3000 萬 信義區 三房」</span>
                </>
              }
            />
            <Step
              n="2"
              title="AI 自動幫你建好客戶檔案"
              body="助手會回確認卡，回「對」就建檔，回「改 預算 2500」就調整。"
            />
            <Step
              n="3"
              title="之後每天早上助手會告訴你該做什麼"
              body="需要跟進的客戶、即將到期的委託、今天的提醒，08:30 推送。"
            />
          </ol>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="sm:flex-1">
              <Link href="/clients/new">
                <Plus className="mr-1 h-4 w-4" />
                直接在這裡新增客戶
              </Link>
            </Button>
            <Button asChild variant="outline" className="sm:flex-1">
              <Link href="/properties/new">
                <Plus className="mr-1 h-4 w-4" />
                新增物件
              </Link>
            </Button>
          </div>

          <p className="mt-6 text-xs text-slate-400">
            還沒加 Bot 為好友？打開 LINE 搜尋 LeadFlow 或從 /beta 頁面掃 QR。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <li className="flex gap-4 rounded-lg border border-slate-200 bg-slate-50/40 p-4">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-bold text-white">
        {n}
      </span>
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-sm text-slate-500">{body}</p>
      </div>
    </li>
  );
}
