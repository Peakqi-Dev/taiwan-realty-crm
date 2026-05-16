"use client";

import Script from "next/script";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    liff?: any;
  }
}

type Phase =
  | { kind: "loading"; message?: string }
  | { kind: "no_liff_id" }
  | { kind: "liff_error"; message: string }
  | { kind: "no_binding" }
  | { kind: "pair_done"; agentName: string; addFriendUrl: string };

/**
 * LIFF endpoint serves two flows, distinguished by the `pair` query param:
 *   - `?pair=<short_code>` → customer flow: capture LINE userId + write
 *     a pending pairing row, then bounce to the bot's add-friend URL.
 *   - no `pair` param      → agent flow: auto-login the agent into LeadFlow.
 *
 * `liff.state` is also consulted because LIFF URLs constructed as
 * `liff.line.me/<id>?x=y` get re-encoded with `liff.state=x%3Dy` inside the
 * LINE webview. Both forms map to the same `pair=<code>` we need.
 */
function getPairCodeFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const direct = new URLSearchParams(window.location.search).get("pair");
  if (direct) return direct;
  const stateRaw = new URLSearchParams(window.location.search).get("liff.state");
  if (stateRaw) {
    const decoded = stateRaw.startsWith("?") ? stateRaw.slice(1) : stateRaw;
    return new URLSearchParams(decoded).get("pair");
  }
  return null;
}

export default function LineConnectPage() {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  const initialize = useCallback(async () => {
    if (!liffId) {
      setPhase({ kind: "no_liff_id" });
      return;
    }
    if (!window.liff) return;

    try {
      setPhase({ kind: "loading", message: "正在連接 LINE..." });
      await window.liff.init({ liffId });
      if (!window.liff.isLoggedIn()) {
        window.liff.login({ redirectUri: window.location.href });
        return;
      }
      const profile = await window.liff.getProfile();

      // Customer pairing flow (came from /r/<short_code>).
      const pairCode = getPairCodeFromUrl();
      if (pairCode) {
        setPhase({ kind: "loading", message: "正在連結業務..." });
        const res = await fetch("/api/line/pair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: pairCode,
            customerLineUserId: profile.userId,
          }),
        });
        const data = await res.json();
        if (!data?.ok) {
          throw new Error(data?.error || "pair failed");
        }
        setPhase({
          kind: "pair_done",
          agentName: data.agentName,
          addFriendUrl: data.addFriendUrl,
        });
        return;
      }

      // Agent auto-login flow (existing).
      setPhase({ kind: "loading", message: "正在登入 LeadFlow..." });
      const res = await fetch("/api/line/auto-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserId: profile.userId,
          redirectTo: "/app",
        }),
      });
      const data = await res.json();
      if (!data?.ok || !data?.actionLink) {
        if (data?.error === "no_binding") {
          setPhase({ kind: "no_binding" });
          return;
        }
        throw new Error(data?.error || "auto-login failed");
      }
      window.location.href = data.actionLink;
    } catch (err: any) {
      setPhase({
        kind: "liff_error",
        message: err?.message || "LIFF 初始化失敗",
      });
    }
  }, [liffId]);

  useEffect(() => {
    if (window.liff) initialize();
  }, [initialize]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Script
        src="https://static.line-scdn.net/liff/edge/2/sdk.js"
        strategy="afterInteractive"
        onLoad={initialize}
      />

      <div className="mx-auto max-w-md px-6 py-16">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/20">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </span>
          <span className="text-sm font-semibold tracking-tight">LeadFlow</span>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur">
          {phase.kind === "loading" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              <p className="text-sm text-slate-400">
                {phase.message ?? "正在連接 LINE..."}
              </p>
            </div>
          )}

          {phase.kind === "no_liff_id" && (
            <NoticeCard
              title="LIFF 尚未設定"
              body="管理員還沒配置 NEXT_PUBLIC_LIFF_ID。請等系統管理員設定完成。"
            />
          )}

          {phase.kind === "liff_error" && (
            <NoticeCard
              title="LIFF 連線失敗"
              body={`錯誤訊息：${phase.message}。請從 LINE Bot 對話視窗的「📊 打開助手」按鈕重新進入。`}
            />
          )}

          {phase.kind === "no_binding" && <NoBindingBlock />}

          {phase.kind === "pair_done" && (
            <PairDoneBlock
              agentName={phase.agentName}
              addFriendUrl={phase.addFriendUrl}
            />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          由 LeadFlow · Nivora AI 提供
        </p>
      </div>
    </div>
  );
}

function NoticeCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-base font-semibold">{title}</h1>
      <p className="text-sm leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}

function PairDoneBlock({
  agentName,
  addFriendUrl,
}: {
  agentName: string;
  addFriendUrl: string;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">準備好了</h1>
      <p className="text-sm leading-relaxed text-slate-400">
        已幫您連結到業務 <span className="font-semibold text-white">{agentName}</span>。
        <br />
        最後一步：加 LeadFlow 為 LINE 好友，{agentName} 的 AI 客服就會立刻為您服務。
      </p>
      {addFriendUrl ? (
        <a
          href={addFriendUrl}
          className="inline-flex w-full items-center justify-center rounded-md bg-[#06C755] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          加 LINE 好友
        </a>
      ) : (
        <p className="text-xs text-amber-300">
          管理員尚未設定加好友連結，請聯絡客服。
        </p>
      )}
    </div>
  );
}

function NoBindingBlock() {
  const addFriendUrl =
    process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL ||
    (process.env.NEXT_PUBLIC_LIFF_ID
      ? `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`
      : "");
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">請先加好友</h1>
      <p className="text-sm leading-relaxed text-slate-400">
        你還沒加 LeadFlow Bot 為好友，沒辦法自動幫你登入。
        <br />
        點下面按鈕直接加 Bot 為好友，加完之後跟 Bot 講一句話就能用助手。
      </p>
      {addFriendUrl ? (
        <a
          href={addFriendUrl}
          className="inline-flex w-full items-center justify-center rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-100"
        >
          加 LeadFlow 為好友
        </a>
      ) : (
        <p className="text-xs text-amber-300">
          管理員尚未設定 NEXT_PUBLIC_LINE_ADD_FRIEND_URL，請聯絡客服。
        </p>
      )}
    </div>
  );
}
