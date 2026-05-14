import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Brain,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Sparkles,
  TimerReset,
  Users,
} from "lucide-react";

export default function MarketingPage() {
  return (
    <>
      <Hero />
      <Pain />
      <Features />
      <Workflow />
      <Showcase />
      <Results />
      <Faq />
      <FinalCTA />
    </>
  );
}

// 1. HERO ───────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Gradient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-500/20 via-purple-500/10 to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1 text-xs text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              Beta 開放申請中
            </div>
            <h1 className="mt-6 text-balance text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              不再漏掉
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                任何一位客戶
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
              專為房仲打造的 AI 業務作業系統。自動整理客戶、追蹤互動、提醒跟進，讓你把時間留給成交。
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-white/10 transition-colors hover:bg-slate-100"
              >
                免費申請 Beta
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/40 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-900"
              >
                立即開始使用
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              無需信用卡 · 個人 / 小型團隊 / 包租代管適用
            </p>
          </div>

          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}

function DashboardMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-blue-500/20 via-purple-500/10 to-transparent blur-2xl" />
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-950/60 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
          <span className="ml-3 text-xs text-slate-500">leadflow.app / dashboard</span>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4">
          <MockStat label="本月帶看" value="12" hint="+3 vs 上月" tone="blue" />
          <MockStat label="委託中物件" value="6" hint="2 件即將到期" tone="amber" />
          <MockStat label="本月新客" value="8" hint="3 個追蹤中" tone="emerald" />
          <MockStat label="今日提醒" value="4" hint="2 件已逾期" tone="rose" />
        </div>

        <div className="space-y-2 px-4 pb-4">
          <p className="text-xs font-medium text-slate-400">今日提醒</p>
          <MockReminder
            label="帶看行程"
            title="下午 3 點 林詩涵 帶看大安森林公園案"
            time="今天 15:00"
            urgent
          />
          <MockReminder
            label="追蹤客戶"
            title="聯繫王俊傑確認週末帶看時段"
            time="今天"
          />
          <MockReminder
            label="委託到期"
            title="信義計畫區豪邸委託剩 6 天"
            time="2026-05-20"
          />
        </div>
      </div>
    </div>
  );
}

function MockStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "blue" | "amber" | "emerald" | "rose";
}) {
  const tones: Record<typeof tone, string> = {
    blue: "from-blue-500/15 to-blue-500/0 text-blue-300",
    amber: "from-amber-500/15 to-amber-500/0 text-amber-300",
    emerald: "from-emerald-500/15 to-emerald-500/0 text-emerald-300",
    rose: "from-rose-500/15 to-rose-500/0 text-rose-300",
  };
  return (
    <div className="rounded-lg border border-slate-800 bg-gradient-to-b p-3 backdrop-blur-sm">
      <div className={`bg-gradient-to-b ${tones[tone]} rounded-md px-2 py-1 text-[10px] inline-block`}>
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="text-[11px] text-slate-500">{hint}</p>
    </div>
  );
}

function MockReminder({
  label,
  title,
  time,
  urgent = false,
}: {
  label: string;
  title: string;
  time: string;
  urgent?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-2.5 ${
        urgent
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-slate-800 bg-slate-950/40"
      }`}
    >
      <span
        className={`mt-0.5 inline-flex h-5 items-center rounded-md px-1.5 text-[10px] ${
          urgent ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-400"
        }`}
      >
        {label}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-slate-200">{title}</p>
        <p className="text-[10px] text-slate-500">{time}</p>
      </div>
    </div>
  );
}

// 2. PAIN ───────────────────────────────────────────────────────────────────

function Pain() {
  const pains = [
    { title: "LINE 訊息一團亂", body: "幾百個群組，重要訊息埋在閒聊裡。" },
    { title: "客戶太多記不住", body: "誰要什麼預算、看過哪些物件，全靠記憶。" },
    { title: "忘記跟進", body: "上週說『再聊聊』的客戶，這週就斷線了。" },
    { title: "委託快到期", body: "等屋主來提醒就太晚了，續約變被動。" },
    { title: "帶看資訊散落", body: "帶看反饋寫在便條紙、群組、記事本到處都有。" },
  ];

  return (
    <section className="border-t border-slate-900/80">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <SectionTag>痛點</SectionTag>
        <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight md:text-4xl">
          房仲每天面對的 5 個痛
        </h2>
        <p className="mt-3 max-w-2xl text-slate-400">
          做房仲不缺努力，缺的是一套能幫你把所有資訊收整起來的系統。
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {pains.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 transition-colors hover:border-slate-700"
            >
              <p className="text-sm font-semibold text-white">{p.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// 3. FEATURES ───────────────────────────────────────────────────────────────

function Features() {
  const features = [
    {
      icon: Brain,
      title: "AI 客戶摘要",
      body: "把 LINE 對話 一鍵生成客戶摘要：預算、需求、聯絡狀態，全部結構化。",
    },
    {
      icon: ClipboardList,
      title: "AI 需求分析",
      body: "自動萃取客戶想要的房型、區域、預算範圍，比客戶自己講得還清楚。",
    },
    {
      icon: Users,
      title: "客戶管理",
      body: "新客戶、追蹤中、議價、成交一目了然，每一階段都有對應行動建議。",
    },
    {
      icon: TimerReset,
      title: "到期提醒",
      body: "委託到期日、追蹤週期、帶看行程，系統主動提醒你下一步該做什麼。",
    },
    {
      icon: MessageSquare,
      title: "互動紀錄",
      body: "每通電話、每次帶看、每次 LINE 對話自動歸檔，永遠記得上次聊到哪。",
    },
    {
      icon: LayoutDashboard,
      title: "Dashboard",
      body: "本月帶看次數、成交漏斗、即將到期委託，所有指標一個畫面看完。",
    },
    {
      icon: Sparkles,
      title: "AI 建議下一步",
      body: "根據客戶狀態與最近互動，告訴你今天應該優先聯絡誰、為什麼。",
    },
  ];

  return (
    <section id="features" className="border-t border-slate-900/80">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <SectionTag>核心功能</SectionTag>
        <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight md:text-4xl">
          一套系統，七個關鍵能力
        </h2>
        <p className="mt-3 max-w-2xl text-slate-400">
          從訊息抓取、客戶建檔、提醒跟進到行動建議，AI 串起整條業務流程。
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-6 transition-all hover:border-slate-700 hover:bg-slate-900/70"
            >
              <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/5 blur-2xl transition-opacity group-hover:opacity-80" />
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-950">
                <Icon className="h-5 w-5 text-blue-300" />
              </div>
              <p className="mt-4 text-base font-semibold text-white">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// 4. WORKFLOW ───────────────────────────────────────────────────────────────

function Workflow() {
  const steps = [
    {
      tag: "1",
      title: "LINE 對話",
      body: "把客戶的 LINE 訊息送進系統。",
    },
    {
      tag: "2",
      title: "AI 分析",
      body: "自動萃取預算、區域、需求關鍵字。",
    },
    {
      tag: "3",
      title: "客戶建檔",
      body: "結構化客戶資料，一鍵建檔。",
    },
    {
      tag: "4",
      title: "提醒跟進",
      body: "系統主動排程下次該聯絡。",
    },
    {
      tag: "5",
      title: "成交管理",
      body: "從帶看到簽約全程可追蹤。",
    },
  ];

  return (
    <section id="workflow" className="border-t border-slate-900/80">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <SectionTag>工作流</SectionTag>
        <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight md:text-4xl">
          5 步驟，把雜訊變成業績
        </h2>
        <p className="mt-3 max-w-2xl text-slate-400">
          不用學新工具，從你已經在用的 LINE 開始，AI 自動往下接。
        </p>

        <div className="relative mt-12">
          <div className="absolute left-1/2 top-7 hidden h-px w-[80%] -translate-x-1/2 bg-gradient-to-r from-transparent via-slate-700 to-transparent md:block" />
          <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((s) => (
              <li
                key={s.tag}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-5"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-bold text-white shadow-lg shadow-blue-500/20">
                  {s.tag}
                </div>
                <p className="mt-3 text-sm font-semibold text-white">
                  {s.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

// 5. SHOWCASE ───────────────────────────────────────────────────────────────

function Showcase() {
  return (
    <section className="border-t border-slate-900/80">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <SectionTag>實際畫面</SectionTag>
        <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight md:text-4xl">
          所有客戶 · 物件 · 提醒，一個畫面看完
        </h2>
        <p className="mt-3 max-w-2xl text-slate-400">
          手機跟電腦都能用，帶看路上也能查資料、改狀態、加紀錄。
        </p>

        <div className="relative mt-10">
          <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[28px] bg-gradient-to-br from-blue-500/15 via-purple-500/10 to-transparent blur-3xl" />
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-950/60 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
              <span className="ml-3 text-xs text-slate-500">
                leadflow.app / properties
              </span>
            </div>
            <div className="grid grid-cols-[180px_1fr] divide-x divide-slate-800">
              <div className="space-y-2 p-4">
                {[
                  { label: "Dashboard", active: false },
                  { label: "物件管理", active: true },
                  { label: "客戶管理", active: false },
                  { label: "提醒事項", active: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-md px-3 py-2 text-xs ${
                      item.active
                        ? "bg-gradient-to-r from-blue-500/20 to-purple-500/10 text-white"
                        : "text-slate-400"
                    }`}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
              <div className="p-5">
                <p className="text-sm font-semibold text-white">物件清單</p>
                <p className="text-xs text-slate-500">共 6 筆物件</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      {
                        title: "信義計畫區 高樓層景觀豪邸",
                        district: "信義區",
                        price: "5,980 萬",
                        status: "議價中",
                        tone: "purple",
                      },
                      {
                        title: "大安森林公園旁 三房兩廳",
                        district: "大安區",
                        price: "4,280 萬",
                        status: "委託中",
                        tone: "blue",
                      },
                      {
                        title: "中山國中捷運 2 房美寓",
                        district: "中山區",
                        price: "1,880 萬",
                        status: "帶看中",
                        tone: "amber",
                      },
                      {
                        title: "內湖科技園區 三房附車位",
                        district: "內湖區",
                        price: "2,680 萬",
                        status: "成交",
                        tone: "emerald",
                      },
                    ] as const
                  ).map((p) => (
                    <ShowcaseCard key={p.title} {...p} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ShowcaseCard({
  title,
  district,
  price,
  status,
  tone,
}: {
  title: string;
  district: string;
  price: string;
  status: string;
  tone: "blue" | "amber" | "purple" | "emerald";
}) {
  const tones: Record<typeof tone, string> = {
    blue: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    purple: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  };
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-xs font-semibold text-white">{title}</p>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${tones[tone]}`}
        >
          {status}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">{district}</p>
      <p className="mt-1 text-sm font-bold text-blue-300">{price}</p>
    </div>
  );
}

// 6. RESULTS ────────────────────────────────────────────────────────────────

function Results() {
  const items = [
    {
      icon: CheckCircle2,
      title: "不再漏掉客戶",
      body: "所有 LINE 對話、來電、帶看紀錄全部歸檔，沒有客戶會被遺忘。",
    },
    {
      icon: TimerReset,
      title: "更快跟進",
      body: "今天該聯絡誰、上次聊到哪、客戶要什麼，打開系統一秒就知道。",
    },
    {
      icon: Users,
      title: "客戶資訊集中",
      body: "預算、區域、需求、互動歷史，每位客戶都有完整檔案。",
    },
    {
      icon: LineChart,
      title: "提升成交效率",
      body: "把時間花在會成交的客戶上，不再為了想起『誰要什麼』而花半小時翻群組。",
    },
  ];

  return (
    <section className="border-t border-slate-900/80">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <SectionTag>使用成果</SectionTag>
        <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight md:text-4xl">
          省下整理的時間，把它變成業績
        </h2>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {items.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
            >
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/10">
                <Icon className="h-5 w-5 text-blue-300" />
              </div>
              <div>
                <p className="text-base font-semibold text-white">{title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// 7. FAQ ────────────────────────────────────────────────────────────────────

function Faq() {
  const items = [
    {
      q: "支援 LINE 嗎?",
      a: "支援。把客戶 LINE 訊息送進 LeadFlow，AI 會自動萃取需求並建檔，並把每次互動歸到對應客戶下。",
    },
    {
      q: "可以多人使用嗎?",
      a: "目前 Beta 階段以個人房仲為主，多人版本（小型團隊、共享客戶池、權限分流）正在開發。",
    },
    {
      q: "適合個人房仲嗎?",
      a: "非常適合。LeadFlow 第一個就是為一人作戰的房仲設計，幫你把零碎的資訊整理成行動清單。",
    },
    {
      q: "需要安裝嗎?",
      a: "不用。完全 Web App，手機跟電腦瀏覽器打開就能用，帶看路上也能即時更新狀態。",
    },
  ];

  return (
    <section id="faq" className="border-t border-slate-900/80">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <SectionTag>常見問題</SectionTag>
        <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight md:text-4xl">
          常見問題
        </h2>

        <div className="mt-10 grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-slate-800 bg-slate-900/40 p-5 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold text-white">
                {item.q}
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 text-slate-400 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// 8. FINAL CTA ──────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="relative overflow-hidden border-t border-slate-900/80">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/15 to-pink-500/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
        <Bell className="mx-auto h-10 w-10 text-blue-300" />
        <h2 className="mt-6 text-balance text-4xl font-bold tracking-tight md:text-5xl">
          讓 AI 幫你管理客戶，
          <br className="hidden md:block" />
          把時間留給成交。
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-slate-400">
          現在申請，第一批 Beta 用戶享受免費試用 + 直接跟產品團隊回饋需求。
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-white/10 transition-colors hover:bg-slate-100"
          >
            免費申請 Beta
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            已有帳號?直接登入 →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1 text-xs text-slate-400">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
      {children}
    </span>
  );
}
