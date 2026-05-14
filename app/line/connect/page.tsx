"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { bindLineAction } from "./actions";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    liff?: any;
  }
}

type Phase =
  | { kind: "loading" }
  | { kind: "no_liff_id" }
  | { kind: "liff_error"; message: string }
  | {
      kind: "ready";
      lineUserId: string;
      displayName: string;
      authedEmail: string | null;
    }
  | { kind: "bound"; displayName: string };

export default function LineConnectPage() {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);

  const initialize = useCallback(async () => {
    if (!liffId) {
      setPhase({ kind: "no_liff_id" });
      return;
    }
    if (!window.liff) {
      // Script tag will call us again on load.
      return;
    }

    try {
      await window.liff.init({ liffId });

      if (!window.liff.isLoggedIn()) {
        // Bounce into LINE login (returns to this page).
        window.liff.login({ redirectUri: window.location.href });
        return;
      }

      const profile = await window.liff.getProfile();

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setPhase({
        kind: "ready",
        lineUserId: profile.userId,
        displayName: profile.displayName || "LINE 用戶",
        authedEmail: user?.email ?? null,
      });
    } catch (err: any) {
      setPhase({
        kind: "liff_error",
        message: err?.message || "LIFF 初始化失敗",
      });
    }
  }, [liffId]);

  useEffect(() => {
    // If the SDK already loaded (e.g. fast nav back), try immediately.
    if (window.liff) initialize();
  }, [initialize]);

  const onBind = async () => {
    if (phase.kind !== "ready") return;
    setSubmitting(true);
    const result = await bindLineAction(phase.lineUserId);
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error || "綁定失敗");
      return;
    }
    setPhase({ kind: "bound", displayName: phase.displayName });
    toast.success("綁定完成");
  };

  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "/line/connect";

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
              <p className="text-sm text-slate-400">正在連接 LINE...</p>
            </div>
          )}

          {phase.kind === "no_liff_id" && (
            <NoticeCard
              title="LIFF 尚未設定"
              body="管理員需要在 Vercel env 設定 NEXT_PUBLIC_LIFF_ID 後才能完成綁定。請等系統管理員配置完成。"
            />
          )}

          {phase.kind === "liff_error" && (
            <NoticeCard
              title="LIFF 連線失敗"
              body={`錯誤訊息：${phase.message}。請從 LINE 內的「綁定帳號」按鈕進入此頁。`}
            />
          )}

          {phase.kind === "ready" && phase.authedEmail && (
            <>
              <h1 className="text-xl font-semibold">綁定 LINE 帳號</h1>
              <p className="mt-2 text-sm text-slate-400">
                把你的 LINE 帳號連到 LeadFlow，之後就能用 LINE 直接跟 AI 助手講話建檔。
              </p>
              <div className="mt-5 space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-sm">
                <Row label="LINE" value={phase.displayName} />
                <Row label="LeadFlow" value={phase.authedEmail} />
              </div>
              <button
                onClick={onBind}
                disabled={submitting}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-white/10 transition-colors hover:bg-slate-100 disabled:opacity-60"
              >
                {submitting ? "綁定中..." : "確認綁定"}
              </button>
            </>
          )}

          {phase.kind === "ready" && !phase.authedEmail && (
            <>
              <h1 className="text-xl font-semibold">需要先登入 LeadFlow</h1>
              <p className="mt-2 text-sm text-slate-400">
                你已用 LINE 帳號「{phase.displayName}」登入。請接著登入或註冊 LeadFlow 帳號，系統會自動完成綁定。
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <Link
                  href={`/login?next=${encodeURIComponent(currentPath)}`}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-white/10 hover:bg-slate-100"
                >
                  登入既有帳號
                </Link>
                <Link
                  href={`/signup`}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-slate-600"
                >
                  建立新帳號
                </Link>
              </div>
            </>
          )}

          {phase.kind === "bound" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              <h1 className="text-xl font-semibold">綁定完成</h1>
              <p className="text-sm text-slate-400">
                你可以關掉這個視窗了。回到 LINE 對助手講一句，它會幫你建檔。
              </p>
              <Link
                href="/app"
                className="mt-2 text-sm text-blue-300 hover:text-blue-200"
              >
                也可以打開 LeadFlow 看你的儀表板 →
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-100">{value}</span>
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
