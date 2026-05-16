"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, MessageCircle, User, AlertCircle, CheckCheck } from "lucide-react";

type Filter = "all" | "unread" | "needs_agent";

interface ConversationItem {
  id: string;
  status: "ai" | "needs_agent" | "agent_handling" | "resolved";
  lastMessageAt: string;
  unreadCount: number;
  customer: { id: string; displayName: string; pictureUrl: string | null } | null;
  lastMessage: { senderType: string; text: string } | null;
}

const STATUS_BADGES: Record<
  ConversationItem["status"],
  { label: string; icon: typeof Bot; className: string }
> = {
  ai: { label: "AI 處理中", icon: Bot, className: "bg-blue-50 text-blue-700" },
  needs_agent: {
    label: "建議接手",
    icon: AlertCircle,
    className: "bg-amber-50 text-amber-700",
  },
  agent_handling: {
    label: "你正在處理",
    icon: User,
    className: "bg-violet-50 text-violet-700",
  },
  resolved: {
    label: "已處理",
    icon: CheckCheck,
    className: "bg-emerald-50 text-emerald-700",
  },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "剛剛";
  if (mins < 60) return `${mins} 分鐘前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(iso).toLocaleDateString("zh-TW");
}

function senderLabel(type: string): string {
  if (type === "customer") return "客人";
  if (type === "ai") return "🤖";
  if (type === "agent") return "你";
  return "";
}

export function ConversationsClient() {
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<ConversationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const res = await fetch(`/api/conversations?filter=${filter}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!alive) return;
        if (!data?.ok) {
          setError(data?.error || "load failed");
          return;
        }
        setItems(data.items as ConversationItem[]);
        setError(null);
      } catch (err) {
        if (alive) setError((err as Error).message);
      } finally {
        if (alive) timer = setTimeout(load, 30000);
      }
    };
    load();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [filter]);

  const FilterChip = ({ value, label }: { value: Filter; label: string }) => (
    <button
      type="button"
      onClick={() => setFilter(value)}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
        filter === value
          ? "bg-slate-900 text-white"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <FilterChip value="all" label="全部" />
        <FilterChip value="unread" label="未讀" />
        <FilterChip value="needs_agent" label="需接手" />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          載入失敗：{error}
        </div>
      )}

      {items === null && !error && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          載入對話中…
        </div>
      )}

      {items?.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <MessageCircle className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            還沒有對話
          </p>
          <p className="mt-1 text-xs text-slate-500">
            客戶掃你的 QR Code 加 LINE 後，會自動出現在這裡。
          </p>
        </div>
      )}

      <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {items?.map((c) => {
          const badge = STATUS_BADGES[c.status];
          const Icon = badge.icon;
          return (
            <li key={c.id}>
              <Link
                href={`/app/conversations/${c.id}`}
                className="flex gap-3 p-4 transition hover:bg-slate-50"
              >
                <div className="relative shrink-0">
                  {c.customer?.pictureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.customer.pictureUrl}
                      alt={c.customer.displayName}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                      {c.customer?.displayName.slice(0, 1) ?? "?"}
                    </div>
                  )}
                  {c.unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {c.unreadCount > 9 ? "9+" : c.unreadCount}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-slate-900">
                      {c.customer?.displayName || "未命名"}
                    </h3>
                    <span className="text-xs text-slate-400">
                      {timeAgo(c.lastMessageAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {c.lastMessage ? (
                      <>
                        <span className="text-slate-400">
                          {senderLabel(c.lastMessage.senderType)}：
                        </span>
                        {c.lastMessage.text}
                      </>
                    ) : (
                      "（尚無訊息）"
                    )}
                  </p>
                  <span
                    className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
                  >
                    <Icon className="h-3 w-3" />
                    {badge.label}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
