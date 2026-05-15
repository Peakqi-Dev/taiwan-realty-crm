"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { applyForBetaAction, type BetaActionState } from "./actions";

const liffUrl =
  process.env.NEXT_PUBLIC_LIFF_ID
    ? `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`
    : "https://taiwan-realty-crm.vercel.app/line/connect";

function qrUrl(target: string, size = 240): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&data=${encodeURIComponent(target)}`;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-white/10 transition-colors hover:bg-slate-100 disabled:opacity-60"
    >
      {pending ? "送出中..." : "免費申請 Beta"}
      {!pending && <ArrowRight className="h-4 w-4" />}
    </button>
  );
}

export default function BetaPage() {
  const [state, formAction] = useFormState<BetaActionState, FormData>(
    applyForBetaAction,
    {},
  );

  if (state.ok) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Header />
        <main className="mx-auto max-w-xl px-6 py-16">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center backdrop-blur">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
            <h1 className="mt-4 text-2xl font-bold">申請已收到 🎉</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              我們已把登入連結寄到 <span className="text-slate-200">{state.email}</span>。<br />
              收信、點連結 → 登入 LeadFlow。
            </p>
            {state.error && (
              <p className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {state.error}
              </p>
            )}

            <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950/40 p-5">
              <p className="text-sm font-semibold text-slate-200">
                順手把 AI 助手加為 LINE 好友
              </p>
              <p className="mt-1 text-xs text-slate-500">
                掃 QR、或點下面按鈕，馬上能用 LINE 跟助手講話建檔。
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl(liffUrl, 240)}
                alt="加入 LeadFlow LINE Bot"
                width={240}
                height={240}
                className="mx-auto mt-4 rounded-lg bg-white p-2"
              />
              <a
                href={liffUrl}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-100 hover:border-slate-600 hover:bg-slate-900"
              >
                直接打開 LINE 加入
              </a>
            </div>

            <p className="mt-6 text-xs text-slate-600">
              已經登入了？<Link href="/app" className="text-blue-300 hover:underline">直接進入 Dashboard →</Link>
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="mx-auto max-w-xl px-6 py-12 md:py-16">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1 text-xs text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            Beta 限量開放
          </div>
          <h1 className="mt-5 text-balance text-3xl font-bold tracking-tight md:text-4xl">
            免費加入 LeadFlow Beta
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            限量開放，搶先體驗 AI 房仲助手
          </p>
        </div>

        <form
          action={formAction}
          className="mt-10 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur"
        >
          <Field label="姓名" required>
            <input
              name="name"
              required
              className={fieldClass}
              placeholder="例：王俊豪"
            />
          </Field>

          <Field label="Email" required hint="登入連結會寄到這個信箱">
            <input
              name="email"
              type="email"
              required
              className={fieldClass}
              placeholder="you@example.com"
            />
          </Field>

          <Field label="電話" required>
            <input
              name="phone"
              type="tel"
              required
              className={fieldClass}
              placeholder="0912-345-678"
            />
          </Field>

          <Field label="LINE ID" hint="選填，方便我們聯絡與 Bot 對應">
            <input
              name="lineId"
              className={fieldClass}
              placeholder="line_id（選填）"
            />
          </Field>

          <Field label="目前任職房仲品牌" hint="選填">
            <input
              name="agency"
              className={fieldClass}
              placeholder="例：信義房屋、永慶、自由人房仲..."
            />
          </Field>

          <Field label="每月大約處理幾個客戶" hint="選填，幫我們了解使用情境">
            <select name="monthlyClients" className={fieldClass} defaultValue="">
              <option value="">請選擇</option>
              <option value="<5">5 個以下</option>
              <option value="5-10">5–10 個</option>
              <option value="10-20">10–20 個</option>
              <option value="20-50">20–50 個</option>
              <option value="50+">50 個以上</option>
            </select>
          </Field>

          {state.error && (
            <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {state.error}
            </p>
          )}

          <SubmitButton />

          <p className="text-center text-xs text-slate-500">
            送出 = 同意收到 LeadFlow 的登入連結與更新通知。
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          已經有帳號了？<Link href="/login" className="text-slate-400 hover:text-slate-200">直接登入 →</Link>
        </p>
      </main>
    </div>
  );
}

const fieldClass =
  "w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

function Field({
  label,
  required = false,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-300">
        {label} {required && <span className="text-rose-300">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function Header() {
  return (
    <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/20">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </span>
          <span className="text-sm font-semibold tracking-tight">LeadFlow</span>
        </Link>
        <Link
          href="/login"
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          登入
        </Link>
      </div>
    </header>
  );
}
