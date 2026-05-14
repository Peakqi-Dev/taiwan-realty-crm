import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "LeadFlow — 專為房仲打造的 AI 業務作業系統",
  description:
    "結合 CRM、AI 工作流、客戶管理、提醒系統與 LINE 對話管理的房仲業務工具。不再漏掉任何一位客戶。",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-900/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-purple-500 text-xs font-bold text-white shadow-lg shadow-blue-500/20">
            L
          </span>
          <span className="text-sm font-semibold tracking-tight">LeadFlow</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-400 md:flex">
          <a href="#features" className="hover:text-slate-100">功能</a>
          <a href="#workflow" className="hover:text-slate-100">工作流</a>
          <a href="#faq" className="hover:text-slate-100">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            登入
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-200"
          >
            免費申請 Beta
          </Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-900 bg-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-start justify-between gap-6 text-sm text-slate-400 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-purple-500 text-xs font-bold text-white">
              L
            </span>
            <span className="font-semibold text-slate-200">LeadFlow</span>
            <span className="text-slate-600">·</span>
            <span>專為房仲打造的 AI 業務作業系統</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-slate-200">登入</Link>
            <Link href="/signup" className="hover:text-slate-200">申請 Beta</Link>
            <a href="#faq" className="hover:text-slate-200">FAQ</a>
          </div>
        </div>
        <p className="mt-6 text-xs text-slate-600">
          © {new Date().getFullYear()} LeadFlow · A Nivora AI product
        </p>
      </div>
    </footer>
  );
}
