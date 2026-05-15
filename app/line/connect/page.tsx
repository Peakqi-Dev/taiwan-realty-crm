"use client";

import Link from "next/link";
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
  | { kind: "no_binding" };

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

          {phase.kind === "no_binding" && (
            <div className="space-y-3">
              <h1 className="text-xl font-semibold">請先加好友</h1>
              <p className="text-sm leading-relaxed text-slate-400">
                你還沒加 LeadFlow Bot 為好友，沒辦法自動幫你登入。
                <br />
                打開 LINE 搜尋 LeadFlow 或從 /beta 頁面掃 QR 加好友，加完後再回來這頁就會直接進入助手。
              </p>
              <Link
                href="/beta"
                className="inline-flex w-full items-center justify-center rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-100"
              >
                打開 /beta 看 QR Code
              </Link>
            </div>
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
