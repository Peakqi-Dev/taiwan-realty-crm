import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { code: string };
}

async function loadAgentByShortCode(code: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agent_profiles")
    .select("user_id, display_name, phone, photo_url, bio")
    .eq("short_code", code)
    .maybeSingle();
  if (error) {
    console.error("[/r/:code] load failed:", error.message);
    return null;
  }
  return data;
}

export default async function AgentLandingPage({ params }: PageProps) {
  const agent = await loadAgentByShortCode(params.code);
  if (!agent) notFound();

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  // LIFF URL with ?pair=<short_code> — /line/connect routes pair flow when
  // this query param is present. Falls back to plain bot add-friend URL when
  // LIFF isn't configured (degrades to "agent + customer share same Bot but
  // we lose the pairing").
  const pairUrl = liffId
    ? `https://liff.line.me/${liffId}?pair=${encodeURIComponent(params.code)}`
    : process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL || "#";

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-12">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-purple-500 shadow">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </span>
          LeadFlow
        </div>

        <section className="mt-10 rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {agent.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={agent.photo_url}
                  alt={agent.display_name}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-slate-100"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-3xl font-bold text-white ring-4 ring-slate-100">
                  {agent.display_name.slice(0, 1)}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 inline-flex items-center rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                在線
              </span>
            </div>

            <h1 className="mt-5 text-xl font-bold">{agent.display_name}</h1>
            {agent.bio ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {agent.bio}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">您的專屬房仲業務</p>
            )}
          </div>

          <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-sm leading-relaxed text-slate-600">
            <p className="font-semibold text-slate-900">加我 LINE 後您可以：</p>
            <ul className="mt-3 space-y-2">
              <li className="flex gap-2">
                <span>🏠</span>
                <span>查看我所有委託中的物件</span>
              </li>
              <li className="flex gap-2">
                <span>💬</span>
                <span>AI 客服 24 小時即時回覆</span>
              </li>
              <li className="flex gap-2">
                <span>📅</span>
                <span>線上預約看屋</span>
              </li>
            </ul>
          </div>

          <a
            href={pairUrl}
            className="mt-8 flex w-full items-center justify-center rounded-2xl bg-[#06C755] py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 transition active:scale-95"
          >
            加我 LINE
          </a>

          <p className="mt-3 text-center text-xs text-slate-400">
            點擊上方按鈕後會跳轉至 LINE 完成加好友
          </p>
        </section>

        <footer className="mt-auto pt-12 text-center text-xs text-slate-400">
          由 LeadFlow · Nivora AI 提供
        </footer>
      </div>
    </main>
  );
}
