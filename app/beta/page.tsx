"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, Sparkles } from "lucide-react";
import { applyForBetaAction, type BetaActionState } from "./actions";

const liffUrl =
  process.env.NEXT_PUBLIC_LIFF_ID
    ? `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`
    : "https://taiwan-realty-crm.vercel.app/line/connect";

function qrUrl(target: string, size = 280): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&data=${encodeURIComponent(target)}`;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900/40 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-600 hover:bg-slate-900 disabled:opacity-60"
    >
      {pending ? "送出中..." : "送出"}
    </button>
  );
}

export default function BetaPage() {
  const [state, formAction] = useFormState<BetaActionState, FormData>(
    applyForBetaAction,
    {},
  );

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
            掃碼加好友，30 秒開始使用
          </p>
        </div>

        {/* Primary path — QR code */}
        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center backdrop-blur">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl(liffUrl, 280)}
            alt="加入 LeadFlow LINE Bot"
            width={280}
            height={280}
            className="mx-auto rounded-lg bg-white p-3"
          />
          <p className="mt-5 text-sm font-semibold text-slate-100">
            用 LINE 掃一下，自動建好帳號
          </p>
          <p className="mt-1 text-xs text-slate-500">
            加好友後就能立刻講「王先生 3000 萬 信義區 三房」開始建檔
          </p>
          <a
            href={liffUrl}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-white/10 hover:bg-slate-100"
          >
            手機點這直接打開 LINE
          </a>
        </div>

        {/* Secondary path — minimal optional form */}
        {!state.ok ? (
          <details className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur [&_summary::-webkit-details-marker]:hidden">
            <summary className="cursor-pointer list-none px-6 py-4 text-sm text-slate-400 hover:text-slate-200">
              不方便掃 QR？留個 Email 我們再寄連結給你 →
            </summary>
            <form action={formAction} className="space-y-4 px-6 pb-6">
              <Field label="姓名">
                <input name="name" className={fieldClass} placeholder="選填" />
              </Field>
              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  required
                  className={fieldClass}
                  placeholder="收登入連結用"
                />
              </Field>
              <input type="hidden" name="phone" value="" />
              <input type="hidden" name="lineId" value="" />
              <input type="hidden" name="agency" value="" />
              <input type="hidden" name="monthlyClients" value="" />
              {state.error && (
                <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  {state.error}
                </p>
              )}
              <SubmitButton />
              <p className="text-center text-xs text-slate-500">
                送出 = 同意收到 LeadFlow 的登入連結。
              </p>
            </form>
          </details>
        ) : (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center backdrop-blur">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <p className="mt-3 text-sm font-semibold">已寄出登入連結</p>
            <p className="mt-1 text-xs text-slate-400">
              請去 <span className="text-slate-200">{state.email}</span> 收信並點開連結。
            </p>
            {state.error && (
              <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {state.error}
              </p>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-600">
          已經有帳號了？
          <Link href="/login" className="text-slate-400 hover:text-slate-200">
            直接登入 →
          </Link>
        </p>
      </main>
    </div>
  );
}

const fieldClass =
  "w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-300">{label}</span>
      {children}
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
